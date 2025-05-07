from fastapi import FastAPI
from fastapi.responses import FileResponse
from os import path


def set_page_routes(app: FastAPI) -> None:
    """
    定義前端頁面路由
    """
    @app.get("/")
    async def index():
        index_path = path.join(
            "frontend", "dist", "index.html"
        )
        print(f"Serving index.html from {index_path}")
        return FileResponse(index_path)
