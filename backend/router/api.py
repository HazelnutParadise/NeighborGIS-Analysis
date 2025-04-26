from fastapi import FastAPI, APIRouter


def _set_api_routes(app: FastAPI) -> None:
    """
    Set up the api routes for the FastAPI application.
    """
    api_router = APIRouter(prefix="/api")

    @api_router.get("/hello")
    async def root():
        return {"Hello": "World"}

    app.include_router(api_router)
