from fastapi.responses import JSONResponse
from dataclasses import asdict
from services import floor_generate
from structs.api_response import APIResponse


async def post_generate_floor_handler(request) -> JSONResponse:
    req_json = await request.json()
    building_area_m2 = float(req_json.get("building_area_m2"))
    arrangement_type = req_json.get("arrangement_type")
    m2_to_ping = float(req_json.get("m2_to_ping")) if req_json.get(
        "m2_to_ping") else 0.3025
    match arrangement_type:
        case "L":
            arrangement_type = floor_generate.ArrangementType.LEFT
        case "R":
            arrangement_type = floor_generate.ArrangementType.RIGHT
        case "T":
            arrangement_type = floor_generate.ArrangementType.TOP
        case "B":
            arrangement_type = floor_generate.ArrangementType.BOTTOM
        case "LR":
            arrangement_type = floor_generate.ArrangementType.BOTH_LEFT_AND_RIGHT
        case "TB":
            arrangement_type = floor_generate.ArrangementType.BOTH_TOP_AND_BOTTOM
        case _:
            raise ValueError("Invalid arrangement type")
    total_units = int(req_json.get("total_units"))
    public_ratio = float(req_json.get("public_ratio"))

    if building_area_m2 <= 0:
        return JSONResponse(
            status_code=400,
            content=asdict(APIResponse(
                message="錯誤的建築面積，建築面積必須大於0。"
            ))
        )

    if total_units <= 0:
        return JSONResponse(
            status_code=400,
            content=asdict(APIResponse(
                message="錯誤的單元數量，單元數量必須大於0。"
            ))
        )

    if arrangement_type in (
        floor_generate.ArrangementType.BOTH_LEFT_AND_RIGHT,
        floor_generate.ArrangementType.BOTH_TOP_AND_BOTTOM
    ) and total_units == 1:
        return JSONResponse(
            status_code=400,
            content=asdict(APIResponse(
                message="錯誤的單元數量，當佈局類型為「左右兩側」或「上下兩側」時，單元數量必須大於1。"
            ))
        )

    if public_ratio <= 0 or public_ratio >= 1:
        return JSONResponse(
            status_code=400,
            content=asdict(APIResponse(
                message="錯誤的公共區域比例，公共區域比例必須在0和1之間。"
            ))
        )

    svg = await floor_generate.generate_floor(
        building_area_m2=building_area_m2,
        total_units=total_units,
        public_ratio=public_ratio,
        balcony_depth=float(req_json.get("balcony_depth")),
        arrangement_type=arrangement_type,
        unit_spacing=float(req_json.get("unit_spacing")),
        m2_to_ping=m2_to_ping,
    )
    if not svg:
        return JSONResponse(
            status_code=500,
            content=asdict(APIResponse(
                message="無法生成平面圖，請檢查輸入參數，或是稍後再試。"
            ))
        )
    return JSONResponse(
        status_code=200,
        content=asdict(APIResponse(
            data=svg
        ))
    )
