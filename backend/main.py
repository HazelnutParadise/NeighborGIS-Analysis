from fastapi import FastAPI
import uvicorn

from routers.router import set_routes

app = FastAPI()

set_routes(app)


if __name__ == "__main__":
    # from llm.llm import call_llm
    # print(call_llm([("system", "在每一句話後面加「好喔」"),
    #       ("user", "Hello, world!")]))
    uvicorn.run(app, host="0.0.0.0", port=8000)
