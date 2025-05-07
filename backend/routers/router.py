from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

from routers.api import set_api_routes
from routers.page import set_page_routes


def set_routes(app: FastAPI) -> None:
    """
    Set up the routes for the FastAPI application.
    """
    app.mount(
        "/assets", StaticFiles(
            directory=os.path.join("frontend", "dist", "assets")
        )
    )
    app.mount(
        "/src", StaticFiles(
            directory=os.path.join("frontend", "src")
        )
    )
    set_api_routes(app)
    set_page_routes(app)
