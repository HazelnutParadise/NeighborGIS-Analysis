from fastapi import FastAPI, APIRouter


def _set_api_routes(app: FastAPI) -> None:
    """
    Set up the api routes for the FastAPI application.
    """
    api_router = APIRouter(prefix="/api")

    @api_router.get("/geocoding/{address}")
    async def geocoding(address: str):
        # Placeholder for geocoding logic
        return {"address": address, "coordinates": [0.0, 0.0]}

    app.include_router(api_router)
