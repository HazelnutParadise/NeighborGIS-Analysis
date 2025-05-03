import time
import hashlib
import pickle
import asyncio
import inspect
from typing import Any, Callable
from functools import wraps
from threading import Lock


class CacheEntry:
    def __init__(self, value: Any):
        self.value = value
        self.create_time = time.time()
        self.last_refresh_time = self.create_time
        self.hit_count = 0

    def hit_rate(self) -> float:
        elapsed = time.time() - self.last_refresh_time
        if elapsed == 0:
            return self.hit_count
        return self.hit_count / elapsed


class SmartCacheManager:
    def __init__(self, min_lifetime_seconds: int, top_k: int):
        self.min_lifetime_seconds = min_lifetime_seconds
        self.top_k = top_k
        self.cache: dict[str, CacheEntry] = {}
        self.max_lifetime_per_key: dict[str, float] = {}
        self.lock = Lock()

    def _cleanup(self):
        now = time.time()
        candidates = []
        force_delete = []

        for key, entry in self.cache.items():
            # 檢查是否超過各自設定的 max_lifetime
            max_lifetime = self.max_lifetime_per_key.get(key)
            if max_lifetime is not None and now - entry.create_time >= max_lifetime:
                force_delete.append(key)
                continue

            # 超過 min_lifetime 才進入競爭
            if now - entry.last_refresh_time >= self.min_lifetime_seconds:
                candidates.append((key, entry.hit_rate()))

        # 強制刪除超過 max_lifetime 的
        for key in force_delete:
            del self.cache[key]
            self.max_lifetime_per_key.pop(key, None)

        if not candidates:
            return

        candidates.sort(key=lambda x: (
            x[1], -self.cache[x[0]].create_time), reverse=True
        )
        to_keep = set(k for k, _ in candidates[:self.top_k])
        to_delete = set(k for k, _ in candidates[self.top_k:])

        for key in to_delete:
            if key in self.cache:
                del self.cache[key]
                self.max_lifetime_per_key.pop(key, None)

        now = time.time()
        for key in to_keep:
            if key in self.cache:
                entry = self.cache[key]
                entry.hit_count = 0
                entry.last_refresh_time = now

    def get(self, key: str):
        with self.lock:
            self._cleanup()
            entry = self.cache.get(key)
            if entry:
                entry.hit_count += 1
                return entry.value
            return None

    def set(self, key: str, value: Any, max_lifetime: int = None):
        with self.lock:
            self._cleanup()
            self.cache[key] = CacheEntry(value)
            if max_lifetime is not None:
                self.max_lifetime_per_key[key] = max_lifetime

    def clear(self):
        with self.lock:
            self.cache.clear()
            self.max_lifetime_per_key.clear()


# 全域統一一個 SmartCacheManager
_default_manager = SmartCacheManager(min_lifetime_seconds=300, top_k=10)


def smart_cache(key: str = "", expire: int = None, verbose: bool = False):
    """
    智慧快取裝飾器。
    - key: 快取key（如果不填則用函式名稱）
    - expire: 最大保留秒數（None代表無限）
    - verbose: 是否顯示 cache hit/miss
    """
    def decorator(func: Callable[..., Any]):
        sig = inspect.signature(func)
        is_async = asyncio.iscoroutinefunction(func)

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()

            sorted_items = tuple(sorted(bound_args.arguments.items()))
            param_bytes = pickle.dumps(sorted_items)
            param_hash = hashlib.md5(param_bytes).hexdigest()

            use_key = (key or func.__name__) + ":" + param_hash

            cached = _default_manager.get(use_key)
            if cached is not None:
                if verbose:
                    print(
                        f"[CACHE HIT] {func.__name__} args={args} kwargs={kwargs}")
                return cached

            result = await func(*args, **kwargs)

            if verbose:
                print(
                    f"[CACHE MISS] {func.__name__} args={args} kwargs={kwargs}")
            _default_manager.set(use_key, result, max_lifetime=expire)
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()

            sorted_items = tuple(sorted(bound_args.arguments.items()))
            param_bytes = pickle.dumps(sorted_items)
            param_hash = hashlib.md5(param_bytes).hexdigest()

            use_key = (key or func.__name__) + ":" + param_hash

            cached = _default_manager.get(use_key)
            if cached is not None:
                if verbose:
                    print(
                        f"[CACHE HIT] {func.__name__} args={args} kwargs={kwargs}")
                return cached

            result = func(*args, **kwargs)

            if verbose:
                print(
                    f"[CACHE MISS] {func.__name__} args={args} kwargs={kwargs}")
            _default_manager.set(use_key, result, max_lifetime=expire)
            return result

        return async_wrapper if is_async else sync_wrapper

    return decorator
