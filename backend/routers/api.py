from fastapi import FastAPI, APIRouter, Request

from handlers.intersect_handler import get_intersect_handler
from handlers.generate_floor_handler import post_generate_floor_handler
from handlers.poi_handler import get_nearby_poi_handler
from handlers.nearby_analysis_handler import post_nearby_analysis_handler


def set_api_routes(app: FastAPI) -> None:
    """
    Set up the api routes for the FastAPI application.
    """
    api_router = APIRouter(prefix="/api")

    @api_router.get("/intersect/{x}")
    async def api_intersect(x: str, request: Request):
        return await get_intersect_handler(request, x)

    @api_router.post("/generate-floor")
    async def api_generate_floor(request: Request):
        return await post_generate_floor_handler(request)

    @api_router.get("/nearby-poi/{coordinates}")
    async def api_nearby_poi(coordinates: str):
        return await get_nearby_poi_handler(coordinates)

    @api_router.post("/nearby-analysis")
    async def api_nearby_analysis(request: Request):
        return await post_nearby_analysis_handler(request)

    app.include_router(api_router)
