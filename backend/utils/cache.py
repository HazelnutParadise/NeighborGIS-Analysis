import time
from typing import Any, Callable
from threading import Lock
from functools import wraps
import asyncio


class CacheManager:
    def __init__(self, expire_seconds: int = 300):
        self.expire_seconds = expire_seconds
        self.cache: dict[str, Any] = {}
        self.cache_time: dict[str, float] = {}
        self.lock = Lock()

    def _cleanup(self):
        now = time.time()
        keys_to_delete = [key for key, ts in self.cache_time.items(
        ) if now - ts >= self.expire_seconds]
        for key in keys_to_delete:
            del self.cache[key]
            del self.cache_time[key]

    def get(self, key: str):
        with self.lock:
            self._cleanup()
            return self.cache.get(key, None)

    def set(self, key: str, value: Any):
        with self.lock:
            self._cleanup()
            self.cache[key] = value
            self.cache_time[key] = time.time()

    def clear(self):
        with self.lock:
            self.cache.clear()
            self.cache_time.clear()


# 全域統一一個 CacheManager（也可以分門別類開多個）
default_cache_manager = CacheManager(expire_seconds=300)


def cache(key: str = "", expire: int = 300):
    """
    裝飾器，用於緩存函數的返回值。
    如果沒有指定 key，會自動使用函數名稱作為快取 key。
    支援 async / sync 函式。
    """
    def decorator(func: Callable[..., Any]):
        manager = CacheManager(expire)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            use_key = key or func.__name__

            cached = manager.get(use_key)
            if cached is not None:
                return cached

            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            manager.set(use_key, result)
            return result

        return wrapper

    return decorator
