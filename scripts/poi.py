import pandas as pd
from geopy.geocoders import ArcGIS
import geopandas as gpd
from shapely.geometry import Point, LineString
import osmnx as ox
from osmnx.features import features_from_polygon
from osmnx._errors import InsufficientResponseError
import folium

# pip install geopy pandas geopandas shapely osmnx folium

# 1. 建立地址 DataFrame
addresses = pd.DataFrame({
    'address': ['臺北市中正區愛國西路1號']
})

# 2. 地理編碼 (ArcGIS)
geolocator = ArcGIS(timeout=10)


def geocode(addr):
    loc = geolocator.geocode(addr)
    return loc.latitude, loc.longitude


coords = addresses['address'].apply(geocode)
addresses[['latitude', 'longitude']] = pd.DataFrame(
    coords.tolist(), index=addresses.index)

# 3. 轉為 GeoDataFrame (WGS84)
gdf = gpd.GeoDataFrame(
    addresses,
    geometry=gpd.points_from_xy(addresses.longitude, addresses.latitude),
    crs='EPSG:4326'
)

# 4. 投影至公尺座標系 (Web Mercator)
gdf_proj = gdf.to_crs(epsg=3857)

# 5. 建立 500 公尺緩衝區（投影狀態下計算）
buffer_proj = gdf_proj.buffer(500)
buffer_gdf_proj = gpd.GeoDataFrame(geometry=buffer_proj, crs=gdf_proj.crs)

# 6. 定義 POI 類型
poi_types = {
    'food': ['restaurant', 'cafe', 'fast_food'],
    'health': ['hospital', 'clinic', 'pharmacy'],
    'public': ['park', 'library', 'community_centre']
}

# 7. 查詢並合併 POI
poi_frames = []
# 將緩衝區轉回經緯度，OSMnx 要求傳入 EPSG:4326
buffer_gdf = buffer_gdf_proj.to_crs(epsg=4326)
polygon_ll = buffer_gdf.geometry.iloc[0]

for category, amenities in poi_types.items():
    tags = {'amenity': amenities}
    try:
        poi = features_from_polygon(polygon_ll, tags)
    except InsufficientResponseError:
        # 查不到就跳過
        continue

    if not poi.empty:
        poi = poi.reset_index()
        poi['poi_type'] = category
        poi_frames.append(
            poi[['poi_type', 'geometry', 'name',
                'addr:full', 'addr:city', 'addr:district']]
        )

# 如果一個標籤都沒撈到，也要避免 concat 時出錯
if poi_frames:
    all_poi = gpd.GeoDataFrame(
        pd.concat(poi_frames, ignore_index=True), crs=poi_frames[0].crs)
    all_poi = all_poi.dropna(subset=['name'])
else:
    all_poi = gpd.GeoDataFrame(columns=[
                               'poi_type', 'geometry', 'name', 'addr:full', 'addr:city', 'addr:district'], crs='EPSG:4326')

# 8. 儲存為 GPKG
all_poi.to_file('poi_geo_buffered.gpkg', driver='GPKG')

# 9. 讀取並選取欄位
mrt_poi = gpd.read_file('poi_geo_buffered.gpkg')[[
    'addr:city', 'name', 'addr:full', 'addr:district', 'poi_type', 'geometry'
]]

# 10. 建立連線 (線段) GeoDataFrame
address_point = gdf_proj.geometry.iloc[0]
lines = []
for _, row in mrt_poi.to_crs(epsg=3857).iterrows():
    geom = row.geometry
    start = geom if geom.geom_type == 'Point' else geom.centroid
    lines.append(LineString(
        [(start.x, start.y), (address_point.x, address_point.y)]))
lines_gdf = gpd.GeoDataFrame(geometry=lines, crs='EPSG:3857')

# 11. 繪製地圖 (Folium)
address_latlon = (addresses.latitude.iloc[0], addresses.longitude.iloc[0])
m = folium.Map(location=address_latlon, zoom_start=15)
folium.Marker(location=address_latlon,
              popup=addresses.address.iloc[0]).add_to(m)

# --- 只處理點狀 POI ---
point_poi = mrt_poi[mrt_poi.geometry.geom_type == 'Point']
colors = {'food': 'blue', 'health': 'green', 'public': 'orange'}
for _, row in point_poi.iterrows():
    lat, lon = row.geometry.y, row.geometry.x
    folium.CircleMarker(
        location=(lat, lon),
        radius=3,
        color=colors.get(row.poi_type, 'black'),
        fill=True,
        popup=f"{row.name}<br>{row['addr:full']}"
    ).add_to(m)

# --- 再處理多邊形 POI（原本就用 GeoJson） ---
folium.GeoJson(
    all_poi.to_crs(epsg=4326).loc[
        all_poi.geom_type.isin(['Polygon', 'MultiPolygon'])
    ],
    style_function=lambda x: {
        'fillColor': 'black', 'color': 'black', 'weight': 0.5,
        'fillOpacity': 0.3, 'opacity': 0.5
    },
    tooltip=folium.GeoJsonTooltip(fields=['name', 'addr:full'])
).add_to(m)

# 緩衝區
folium.GeoJson(
    buffer_gdf,
    style_function=lambda x: {
        'fillColor': 'red', 'color': 'black', 'weight': 0.5,
        'fillOpacity': 0.3, 'opacity': 0.5
    }
).add_to(m)

# 保存 HTML
m.save('map.html')
