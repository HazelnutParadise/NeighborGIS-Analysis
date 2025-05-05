import geopandas as gpd
from fastapi.responses import JSONResponse
from dataclasses import asdict

from structs.api_response import APIResponse
from services.poi import get_nearby_poi


async def get_nearby_poi_handler(address: str):
    pois: gpd.GeoDataFrame = await get_nearby_poi(address)
    if pois.empty:
        return JSONResponse(
            status_code=404,
            content=asdict(APIResponse(
                status_code=404,
                message="查無該地址附近的POI資訊。"
            )))
    return JSONResponse(
        status_code=200,
        content=asdict(APIResponse(
            message="成功獲取POI資訊。",
            data=pois.to_json()
        )))
