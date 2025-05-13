from fastapi import Request
from fastapi.responses import JSONResponse
from dataclasses import asdict

from services.points_compare import llm_compare_points
from structs.api_response import APIResponse


async def post_points_compare_handler(request: Request) -> JSONResponse:
    """
    處理點位比較請求的處理器
    :param request: FastAPI請求對象
    :return: JSONResponse
    """
    # 獲取請求數據
    data = await request.json()
    result: (dict | None) = None
    try:
        result: str = await llm_compare_points(data)
        result = result.replace("```html", "").replace("```", "")  # 去除多餘的反引號

    except Exception as e:
        print(f"LLM 比較地點時發生錯誤: {e}")
        return JSONResponse(
            status_code=500,
            content=asdict(APIResponse(
                message=f"地點比較失敗。{str(e)}",
            ))
        )
    return JSONResponse(
        status_code=200,
        content=asdict(APIResponse(
            message="地點比較成功。",
            data=result
        ))
    )
