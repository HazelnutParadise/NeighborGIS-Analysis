from fastapi import FastAPI


def set_routes(app: FastAPI) -> None:
    """
    Set up the routes for the FastAPI application.
    """
    @app.get("/")
    async def root():
        return {"Hello": "World"}
