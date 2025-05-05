import geopandas as gpd
from fastapi.responses import JSONResponse
from dataclasses import asdict
import json

from structs.api_response import APIResponse
from structs.adress_point import Coordinates
from services.poi import get_nearby_poi


async def get_nearby_poi_handler(coordinates: str) -> JSONResponse:
    latitude, longitude = coordinates.split(",")
    lat, lng = float(latitude), float(longitude)
    pois: gpd.GeoDataFrame = await get_nearby_poi(Coordinates(lat=lat, lng=lng), distance=500)
    if pois.empty:
        return JSONResponse(
            status_code=404,
            content=asdict(APIResponse(
                status_code=404,
                message="查無該地址附近的POI資訊。"
            )))
    poisJSON = pois.to_json()
    poisObj = json.loads(poisJSON)
    return JSONResponse(
        status_code=200,
        content=asdict(APIResponse(
            message="成功獲取POI資訊。",
            data=poisObj
        )))
