from fastapi import FastAPI
import uvicorn

from api.endpoints import set_routes

app = FastAPI()

set_routes(app)


if __name__ == "__main__":
    uvicorn.run(app,  port=8000)
