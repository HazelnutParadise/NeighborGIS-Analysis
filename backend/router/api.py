from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
import asyncio
from dataclasses import dataclass, asdict


from structs.adress_point import Coordinate, AddressPoint
from services import geocoding, intersect, floor_generate


@dataclass
class APIResponse:
    message: str = None
    data: any = None


def _set_api_routes(app: FastAPI) -> None:
    """
    Set up the api routes for the FastAPI application.
    """
    api_router = APIRouter(prefix="/api")

    @api_router.get("/intersect/{address}")
    async def api_intersect(address: str):
        coordinates: Coordinate = await asyncio.to_thread(geocoding.arcgis_geocode, address)
        address_point = AddressPoint(
            address=address,
            coordinate=coordinates,
        )
        zoning = await intersect.intersect_with_zones(address_point)
        address_point.zoning = zoning
        print(address_point)

        if not address_point:
            return JSONResponse(
                status_code=404,
                content=asdict(APIResponse(
                    message="No zoning found for the given address."
                ))
            )
        return JSONResponse(
            status_code=200,
            content=asdict(APIResponse(
                data=address_point
            ))
        )

    @api_router.post("/generate-floor")
    async def api_generate_floor(request: Request):
        req_json = await request.json()
        arrangement_type = req_json.get("arrangement_type")
        match arrangement_type:
            case "L":
                arrangement_type = floor_generate.ArrangementType.LEFT
            case "R":
                arrangement_type = floor_generate.ArrangementType.RIGHT
            case "T":
                arrangement_type = floor_generate.ArrangementType.TOP
            case "B":
                arrangement_type = floor_generate.ArrangementType.BOTTOM
            case "LR":
                arrangement_type = floor_generate.ArrangementType.BOTH_LEFT_AND_RIGHT
            case "TB":
                arrangement_type = floor_generate.ArrangementType.BOTH_UP_AND_DOWN
            case _:
                raise ValueError("Invalid arrangement type")
        # todo
        svg = await floor_generate.generate_floor(
            building_area_m2=req_json.get("building_area_m2"),
            total_units=req_json.get("total_units"),
            public_ratio=req_json.get("public_ratio"),
            balcony_depth=req_json.get("balcony_depth"),
            arrangement_type=arrangement_type,
            unit_spacing=req_json.get("unit_spacing"),
            m2_to_ping=req_json.get("m2_to_ping"),
        )
        if not svg:
            return JSONResponse(
                status_code=500,
                content=asdict(APIResponse(
                    message="Failed to generate floor plan."
                ))
            )
        return JSONResponse(
            status_code=200,
            content=asdict(APIResponse(
                data=svg
            ))
        )

    app.include_router(api_router)
