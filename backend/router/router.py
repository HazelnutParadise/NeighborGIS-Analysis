from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

from router.api import set_api_routes
from router.page import set_page_routes


def set_routes(app: FastAPI) -> None:
    """
    Set up the routes for the FastAPI application.
    """
    app.mount(
        "/assets", StaticFiles(directory=os.path.join("frontend", "assets"))
    )
    set_api_routes(app)
    set_page_routes(app)
