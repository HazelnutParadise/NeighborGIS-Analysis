import asyncio
from llm.llm import call_llm, ResponseMode
import json


async def llm_nearby_analysis(data) -> dict | None:
    poi_types = ["餐飲", "醫療", "公共設施"]
    system_prompt = """
你是一位專業的地理資訊分析師，負責分析周邊環境資料。
請100%遵守user的指示，並提供詳細的分析結果。
"""
    prompt = f"""
以下是「{data.get('address')}」的周邊POI資料，請針對{poi_types}等方面進行分析，總結其在這些方面的優勢和劣勢。
以簡潔明瞭的方式總結該地區生活機能特點，並比較不同生活機能類別之間的差異。

poi資料：
{data.get('nearby_poi')}

其中，`distance`表示該POI距離「{data.get('address')}」的距離，`name`表示POI名稱，`poi_type`表示POI類型。

請以JSON格式回傳分析結果，格式如下：
```json
{{
    "analysis": {[
        {
            "poi_type": poi_type,
            "advantages": ["優勢1", "優勢2"],
            "disadvantages": ["劣勢1", "劣勢2"]
        }for poi_type in poi_types
    ]},
    ],
    "summary": "總結分析結果"
}}
```

規則：
1. 請根據POI資料進行分析，並提供優勢和劣勢的具體例子。
2. 請確保JSON格式正確，包含所有必要的欄位，並且不要新增任何額外的欄位。
3. 僅針對POI類別進行分析，而不是個別POI。
"""
    result = None
    try:
        result = call_llm([
            ('system', system_prompt),
            ('user', prompt),
        ], response_mode=ResponseMode.DICT)
    except Exception as e:
        raise e

    return result
