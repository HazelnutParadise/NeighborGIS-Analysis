from enum import Enum
from config.consts import OLLAMA_BASE_URL
from typing import Any
from langchain_core.messages import BaseMessage
from langchain_ollama import ChatOllama
import json

llm = ChatOllama(model="gemma3:12b", base_url=OLLAMA_BASE_URL, temperature=0.1)


class ResponseMode(Enum):
    RAW = 0
    DICT = 1
    STRING = 2


def call_llm(anything: Any, response_mode: ResponseMode = ResponseMode.STRING) -> (str | BaseMessage | dict | None):
    response = llm.invoke(anything)
    match response_mode:
        case ResponseMode.RAW:
            return response
        case ResponseMode.DICT:
            try:
                response = response.content.replace(
                    "```json", "").replace("```", "").strip()
                return json.loads(response)
            except json.JSONDecodeError:
                raise ValueError("無法解析JSON格式")
        case ResponseMode.STRING:
            return response.content
        case _:
            raise ValueError("不支援的llm回應模式")
