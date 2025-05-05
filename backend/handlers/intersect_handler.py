import asyncio
from dataclasses import asdict
from fastapi import Request
from fastapi.responses import JSONResponse
from services import geocoding, intersect
from structs.adress_point import Coordinates, AddressPoint
from structs.api_response import APIResponse


async def get_intersect_handler(request: Request, x: str):
    use_coordinates = request.query_params.get("use_coordinates")
    address: str = None
    coordinates: Coordinates = None
    if str(use_coordinates).lower() != "true":
        coordinates: Coordinates = await asyncio.to_thread(geocoding.arcgis_geocode, x)
        address = x
    else:
        lat = float(x.split(",")[0])
        lng = float(x.split(",")[1])
        coordinates = Coordinates(
            lat=lat,
            lng=lng
        )
        address = f'目前位置({lat}, {lng})'
        print(address)
    address_point = AddressPoint(
        address=address,
        coordinates=coordinates,
    )
    zoning = await intersect.intersect_with_zones(address_point)
    address_point.zoning = zoning
    print(address_point)

    if not address_point:
        return JSONResponse(
            status_code=404,
            content=asdict(APIResponse(
                message="無法找到該地址，請檢查地址是否正確。"
            ))
        )
    return JSONResponse(
        status_code=200,
        content=asdict(APIResponse(
            data=address_point
        ))
    )
