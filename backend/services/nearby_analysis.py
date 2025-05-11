from llm.llm import call_llm, ResponseMode


async def llm_nearby_analysis(data) -> dict | None:
    poi_types = ["餐飲", "醫療", "公共設施"]
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
- 你是一位專業的地理環境分析師，負責根據資料分析周邊環境。
- 僅根據提供的 POI 資料內容進行分析，不得評論資料本身是否完整、缺乏或不足，例如「沒有資料」「資料不完整」「地址資訊不完整」「無法分析」等說法一律禁止。
- 如果某類別的 POI 數量為 0，也不得直接指出「沒有資料」或「無法分析」，請改以中性描述進行推論，例如：「未觀察到此類型設施，可能影響某某機能」。
- 嚴格遵守格式，不增刪任何欄位。
- 規則：
    1. 請根據POI資料進行分析，並提供優勢和劣勢的具體例子。
    2. 請確保JSON格式正確，包含所有必要的欄位，並且不要新增任何額外的欄位。
    3. 僅針對POI類別進行分析，而不是個別POI。
- 違反以上規則將導致重大損失。
"""
    result = None
    try:
        result = call_llm(
            prompt,
            response_mode=ResponseMode.DICT
        )
    except Exception as e:
        raise e

    return result
