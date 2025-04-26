from fastapi import FastAPI, APIRouter
import asyncio
from services.geocoding import arcgis_geocode

from structs.adress_point import Coordinate, AddressPoint
from services.intersect import intersect_with_zones


def _set_api_routes(app: FastAPI) -> None:
    """
    Set up the api routes for the FastAPI application.
    """
    api_router = APIRouter(prefix="/api")

    @api_router.get("/intersect/{address}")
    async def intersect(address: str):
        coordinates: Coordinate = await asyncio.to_thread(arcgis_geocode, address)
        address_point = AddressPoint(
            address=address,
            coordinate=coordinates,
        )
        zoning = intersect_with_zones(address_point)
        address_point.zoning = zoning
        print(address_point)
        return address_point

    app.include_router(api_router)
