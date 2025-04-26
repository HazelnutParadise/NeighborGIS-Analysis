from fastapi import FastAPI
from router.api import _set_api_routes
from router.page import _set_page_routes


def set_routes(app: FastAPI) -> None:
    """
    Set up the routes for the FastAPI application.
    """
    _set_api_routes(app)
    _set_page_routes(app)
