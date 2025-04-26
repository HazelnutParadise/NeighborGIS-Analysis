import os
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import matplotlib.pyplot as plt
import folium

from geocoding import arcgis_geocode

# ----------------------------------------------------------------------------
# Step 1. 建立資料夾
# ----------------------------------------------------------------------------
# os.makedirs('Input/Zoning', exist_ok=True)
os.makedirs("output", exist_ok=True)

# ----------------------------------------------------------------------------
# Step 2. 讀取土地使用分區（Shapefile）
# ----------------------------------------------------------------------------
shp_path = "Input/zoning_regu.shp"
if not os.path.exists(shp_path):
    raise FileNotFoundError(f"{shp_path} 不存在，請確認檔案路徑")

land = gpd.read_file(shp_path)  # crs 預設從檔案帶入

# ----------------------------------------------------------------------------
# Step 3. 地址清單與地理編碼（ArcGIS）
# ----------------------------------------------------------------------------
addresses = pd.DataFrame(
    {
        "address": [
            "No. 101號, Section 2, Zhongcheng Rd, Shilin District, Taipei City, 11153",
            "臺北市中正區愛國西路1號",
        ],
        "id": ["A", "B"],
    }
)

addresses[["latitude", "longitude"]] = addresses["address"].apply(
    arcgis_geocode
)


# ----------------------------------------------------------------------------
# Step 4. 建立 GeoDataFrame 並輸出 GeoJSON
# ----------------------------------------------------------------------------
gdf_pts = gpd.GeoDataFrame(
    addresses.dropna(subset=["latitude", "longitude"]),
    geometry=[
        Point(xy) for xy in zip(addresses.longitude, addresses.latitude)
    ],
    crs="EPSG:4326",
)

geojson_out = "output/geocoded_points.geojson"
gdf_pts.to_file(geojson_out, driver="GeoJSON")


# ----------------------------------------------------------------------------
# Step 6. Leaflet 互動地圖
# ----------------------------------------------------------------------------
m = folium.Map(
    location=[25.04422, 121.5263],
    zoom_start=11,
    tiles="OpenStreetMap"
)

for _, row in gdf_pts.iterrows():
    folium.Marker(
        location=[row.latitude, row.longitude],
        popup=f"ID: {row.id}<br>Address: {row.address}",
    ).add_to(m)
 
m.save("output/geocoded_map.html")

# ----------------------------------------------------------------------------
# Step 7. 簡化土地使用分區屬性
# ----------------------------------------------------------------------------
land_simp = land[["zone", "FAR", "BCR", "geometry"]].copy()

# ----------------------------------------------------------------------------
# Step 8. 空間連接：查詢每個點落在哪個使用分區
# ----------------------------------------------------------------------------
# 使用左連接，how='left' 並且 op='within'
pts_with_zone = gpd.sjoin(
    gdf_pts,
    land_simp,
    how="left",
    predicate="within"
).drop(
    columns=["index_right"]
)

# ----------------------------------------------------------------------------
# Step 9. 讀取公有土地（GeoPackage）
# ----------------------------------------------------------------------------
public_gpkg = "Input/land_public_fix.gpkg"
land_public = gpd.read_file(public_gpkg)
land_public_simp = land_public[["Name", "Area", "geometry"]].copy()
poly_land = land_public_simp[
    land_public_simp.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
]

# ----------------------------------------------------------------------------
# Step 10. 讀取完整分區（GeoPackage）
# ----------------------------------------------------------------------------
full_zone_gpkg = "Input/zoning_fixed.gpkg"
full_zone = gpd.read_file(full_zone_gpkg)
full_zone = full_zone[full_zone.geometry.geom_type.isin(
    ["Polygon", "MultiPolygon"]
)]

# ----------------------------------------------------------------------------
# Step 11. 標記是否為公有土地
# ----------------------------------------------------------------------------
# 先做空間連接，再根據是否有匹配到多邊形來標記
pts_pub = gpd.sjoin(
    pts_with_zone,
    poly_land,
    how="left",
    predicate="within"
).rename(
    columns={"Name": "公有土地名稱"}
)

# 如果 sjoin 後 '公有土地名稱' 為 NaN，就標為 N，否則 Y
pts_pub["公有土地"] = pts_pub["公有土地名稱"].notna().map({True: "Y", False: "N"})

# ----------------------------------------------------------------------------
# Step 12. Leaflet 地圖（含圖層控制）
# ----------------------------------------------------------------------------
m2 = folium.Map(location=[25.04422, 121.5263],
                zoom_start=11, tiles="CartoDB positron")

# 點位圖層
fg_pts = folium.FeatureGroup(name="地址座標")
for _, row in pts_pub.iterrows():
    folium.Marker(
        location=[row.latitude, row.longitude],
        popup=(
            f"ID: {row.id}<br>"
            f"Address: {row.address}<br>"
            f"使用分區: {row.zone}<br>"
            f"容積率: {row.FAR}<br>"
            f"建蔽率: {row.BCR}<br>"
            f"是否為公有土地: {row.公有土地}"
        ),
    ).add_to(fg_pts)
fg_pts.add_to(m2)

# 圖層控制
folium.LayerControl(collapsed=False).add_to(m2)

# 輸出 HTML
m2.save("output/final_map.html")
