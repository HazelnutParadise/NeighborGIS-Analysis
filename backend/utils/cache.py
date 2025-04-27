import time
import hashlib
import pickle
import asyncio
import inspect
from typing import Any, Callable
from functools import wraps
from threading import Lock


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


def cache(key: str = "", expire: int = 300, verbose: bool = False):
    """
    快取函式結果，根據「完整參數值」一致性產生key。
    支援 async / sync 函式。
    如果 verbose=True，命中快取時會印出訊息。
    """
    def decorator(func: Callable[..., Any]):
        manager = CacheManager(expire)
        sig = inspect.signature(func)
        is_async = asyncio.iscoroutinefunction(func)  # 提前檢查

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()

            sorted_items = tuple(sorted(bound_args.arguments.items()))
            param_bytes = pickle.dumps(sorted_items)
            param_hash = hashlib.md5(param_bytes).hexdigest()

            use_key = (key or func.__name__) + ":" + param_hash

            cached = manager.get(use_key)
            if cached is not None:
                if verbose:
                    print(
                        f"[CACHE HIT] {func.__name__} args={args} kwargs={kwargs}")
                return cached

            result = await func(*args, **kwargs)

            if verbose:
                print(
                    f"[CACHE MISS] {func.__name__} args={args} kwargs={kwargs}")
            manager.set(use_key, result)
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()

            sorted_items = tuple(sorted(bound_args.arguments.items()))
            param_bytes = pickle.dumps(sorted_items)
            param_hash = hashlib.md5(param_bytes).hexdigest()

            use_key = (key or func.__name__) + ":" + param_hash

            cached = manager.get(use_key)
            if cached is not None:
                if verbose:
                    print(
                        f"[CACHE HIT] {func.__name__} args={args} kwargs={kwargs}")
                return cached

            result = func(*args, **kwargs)

            if verbose:
                print(
                    f"[CACHE MISS] {func.__name__} args={args} kwargs={kwargs}")
            manager.set(use_key, result)
            return result

        # 決定要回傳 async 包裝還是 sync 包裝
        return async_wrapper if is_async else sync_wrapper

    return decorator
