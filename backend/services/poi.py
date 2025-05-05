import pandas as pd
import geopandas as gpd
import asyncio
from osmnx.features import features_from_polygon
from osmnx._errors import InsufficientResponseError

from structs.adress_point import Coordinates


async def get_nearby_poi(coordinates: Coordinates, distance: int = 500) -> gpd.GeoDataFrame:
    """
    根據經緯度獲取附近的 POI
    :param coordinates: 座標點 (經緯度)
    :param distance: 距離 (公尺)
    :return: POI GeoDataFrame
    """
    # 1. 建立緩衝區
    polygon_ll = await _create_buffer_polygon(coordinates, distance)

    # 2. 查詢所有POI
    all_poi = await _fetch_all_poi_types(polygon_ll)

    return all_poi


async def _create_buffer_polygon(coordinates: Coordinates, distance: int) -> gpd.GeoSeries:
    """
    建立座標點並計算緩衝區
    :param coordinates: 座標點
    :param distance: 緩衝區距離 (公尺)
    :return: 緩衝區多邊形 (經緯度坐標系)
    """
    # 建立 GeoDataFrame (WGS84)
    gdf = gpd.GeoDataFrame(
        [{'latitude': coordinates.lat, 'longitude': coordinates.lng}],
        geometry=gpd.points_from_xy([coordinates.lng], [coordinates.lat]),
        crs='EPSG:4326'
    )

    # 投影至公尺座標系計算緩衆區，再轉回經緯度
    buffer = gdf.to_crs(epsg=3857).buffer(distance).to_crs(epsg=4326)

    return buffer.iloc[0]


async def _fetch_all_poi_types(polygon_ll) -> gpd.GeoDataFrame:
    """
    並行查詢所有類型的POI並合併結果
    :param polygon_ll: 緩衝區多邊形
    :return: 合併後的POI GeoDataFrame
    """
    # 定義 POI 類型
    poi_types = {
        'food': ['restaurant', 'cafe', 'fast_food'],
        'health': ['hospital', 'clinic', 'pharmacy'],
        'public': ['park', 'library', 'community_centre']
    }

    # 並行查詢所有POI類型
    tasks = [
        _fetch_poi_by_type(polygon_ll, category, amenities)
        for category, amenities in poi_types.items()
    ]

    # 等待所有任務完成
    results = await asyncio.gather(*tasks)

    # 過濾掉None結果
    poi_frames = [df for df in results if df is not None]

    # 合併結果
    if poi_frames:
        all_poi = gpd.GeoDataFrame(
            pd.concat(poi_frames, ignore_index=True), crs=poi_frames[0].crs)
        return all_poi.dropna(subset=['name'])

    # 返回空的GeoDataFrame
    return gpd.GeoDataFrame(
        columns=[
            'poi_type', 'geometry', 'name', 'addr:full', 'addr:city', 'addr:district'
        ],
        crs='EPSG:4326'
    )


async def _fetch_poi_by_type(polygon_ll, category: str, amenities: list) -> gpd.GeoDataFrame:
    """
    查詢特定類型的POI
    :param polygon_ll: 緩衝區多邊形
    :param category: POI類別名稱
    :param amenities: POI類別標籤列表
    :return: 該類別的POI資料，查詢失敗時返回None
    """
    tags = {'amenity': amenities}
    try:
        poi = features_from_polygon(polygon_ll, tags)
        if poi.empty:
            return None

        # 處理資料
        poi = poi.reset_index()
        poi['poi_type'] = category

        # 確保必要欄位存在
        for col in ['addr:full', 'addr:city', 'addr:district']:
            if col not in poi.columns:
                poi[col] = None

        # 選取需要的欄位
        return poi[['poi_type', 'geometry', 'name',
                    'addr:full', 'addr:city', 'addr:district']]

    except InsufficientResponseError:
        return None
