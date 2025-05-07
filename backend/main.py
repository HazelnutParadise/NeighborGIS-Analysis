from fastapi import FastAPI
import uvicorn
import asyncio

from routers.router import set_routes
from services.nearby_analysis import llm_nearby_analysis

app = FastAPI()

set_routes(app)


if __name__ == "__main__":
    # asyncio.run(llm_nearby_analysis({
    #     "address": "台北市信義區松高路12號",
    #     "nearby_poi": [
    #         {"name": "鼎泰豐", "distance": 200, "poi_type": "餐飲"},
    #         {"name": "台大醫院", "distance": 500, "poi_type": "醫療"},
    #         {"name": "信義公園", "distance": 300, "poi_type": "公共設施"}
    #     ]
    # }))
    uvicorn.run(app, host="0.0.0.0", port=8000)
