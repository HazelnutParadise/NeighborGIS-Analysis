from fastapi import Request
from fastapi.responses import JSONResponse
from dataclasses import asdict

from services.nearby_analysis import llm_nearby_analysis
from structs.api_response import APIResponse


async def post_nearby_analysis_handler(request: Request) -> JSONResponse:
    """
    處理鄰近分析請求的處理器
    :param request: FastAPI請求對象
    :return: JSONResponse
    """
    # 獲取請求數據
    data = await request.json()
    result: (dict | None) = None
    try:
        result = await llm_nearby_analysis(data)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=asdict(APIResponse(
                message=f"附近環境分析失敗。{str(e)}",
            ))
        )
    return JSONResponse(
        status_code=200,
        content=asdict(APIResponse(
            message="附近環境分析成功。",
            data=result
        ))
    )
