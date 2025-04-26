from fastapi import FastAPI
import uvicorn

from router.router import set_routes

app = FastAPI()

set_routes(app)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
