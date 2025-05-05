import pandas as pd
import geopandas as gpd
from osmnx.features import features_from_polygon
from osmnx._errors import InsufficientResponseError

from structs.adress_point import Coordinates


async def get_nearby_poi(coordinates: Coordinates, distance: int = 500) -> gpd.GeoDataFrame:
    """
    根據經緯度獲取附近的 POI (500 公尺內)
    :param lat: 緯度
    :param lng: 經度
    :param distance: 距離 (公尺)
    :return: POI GeoDataFrame
    """
    # 1. 建立 GeoDataFrame (WGS84)
    gdf = gpd.GeoDataFrame(
        [{'latitude': coordinates.lat, 'longitude': coordinates.lng}],
        geometry=gpd.points_from_xy([coordinates.lng], [coordinates.lat]),
        crs='EPSG:4326'
    )

    # 2. 投影至公尺座標系 (Web Mercator)
    gdf_proj = gdf.to_crs(epsg=3857)

    # 3. 建立 500 公尺緩衝區（投影狀態下計算）
    buffer_proj = gdf_proj.buffer(distance)
    buffer_gdf_proj = gpd.GeoDataFrame(geometry=buffer_proj, crs=gdf_proj.crs)

    # 4. 定義 POI 類型
    poi_types = {
        'food': ['restaurant', 'cafe', 'fast_food'],
        'health': ['hospital', 'clinic', 'pharmacy'],
        'public': ['park', 'library', 'community_centre']
    }

    # 5. 查詢並合併 POI
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

            # 確保必要欄位存在
            for col in ['addr:full', 'addr:city', 'addr:district']:
                if col not in poi.columns:
                    poi[col] = None

            # 選取需要的欄位
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
        all_poi = gpd.GeoDataFrame(
            columns=[
                'poi_type', 'geometry', 'name', 'addr:full', 'addr:city', 'addr:district'
            ],
            crs='EPSG:4326'
        )

    # 6. 回傳 POI GeoDataFrame
    return all_poi
