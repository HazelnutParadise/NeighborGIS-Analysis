from llm.llm_config import OLLAMA_BASE_URL
from typing import Any

from langchain_ollama import ChatOllama

llm = ChatOllama(model="gemma3:12b", base_url=OLLAMA_BASE_URL)


def call_llm(anything: Any):
    response = llm.invoke(anything)
    return response
