from fastapi import FastAPI, APIRouter
import pandas as pd
import asyncio

from services.geocoding import arcgis_geocode


def _set_api_routes(app: FastAPI) -> None:
    """
    Set up the api routes for the FastAPI application.
    """
    api_router = APIRouter(prefix="/api")

    @api_router.get("/geocoding/{address}")
    async def geocoding(address: str):
        coordinates: pd.Series = await asyncio.to_thread(arcgis_geocode, address)
        return {"address": address, "coordinates": {
            "lat": coordinates["latitude"],
            "lng": coordinates["longitude"]
        }}

    app.include_router(api_router)
