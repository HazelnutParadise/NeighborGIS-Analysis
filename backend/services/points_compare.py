from llm.llm import call_llm, ResponseMode


async def llm_compare_points(data: list[dict]) -> str | None:
    aspect_to_be_compared = ['使用分區', '容積率', '建蔽率', '是否為公有地', '周邊POI']
    points_data_str = ""
    for i, point_data in enumerate(data, start=1):
        points_data_str += f"{i}. {point_data['address']}：\n"
        for key, value in point_data.items():
            if key == "address" or key == "nearby_poi":
                continue
            points_data_str += f"   - {key}：{value}。\n"
        points_data_str += "\n"
    print(points_data_str)
    prompt = f"""
以下是{len(data)}個地點的相關資料，請針對{aspect_to_be_compared}等方面進行比較，並生成一段總結。
```
""" + points_data_str + """
```

- 請考慮所有提到的分析面向。
- 請將所有地點的資料納入比較，不得忽略任何地點。
- 每一個地點都在不同區域。
- 請以文字格式回傳分析結果，如需排版、樣式等，使用HTML標籤，但不得使用'```'。
- 請勿包含任何額外的文字或說明。
- 僅根據提供的資料內容進行分析，不得評論資料本身是否完整、缺乏或不足，例如「沒有資料」「資料不完整」「地址資訊不完整」「無法分析」等說法一律禁止。
- 違反以上規則將導致重大損失。
"""
    result = None
    try:
        result = call_llm(
            prompt,
            response_mode=ResponseMode.STRING
        )
    except Exception as e:
        raise e

    return result
