from fastapi import FastAPI


def _set_api_routes(app: FastAPI) -> None:
    """
    Set up the routes for the FastAPI application.
    """
    @app.get("/api")
    async def root():
        return {"Hello": "World"}
