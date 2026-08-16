"""Small bounded process-local TTL cache for idempotent inference results."""
import hashlib
import json
import time


class TTLCache:
    def __init__(self, ttl_seconds=60, max_items=256):
        self.ttl_seconds = ttl_seconds
        self.max_items = max_items
        self._items = {}

    def key(self, value):
        return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

    def get(self, value):
        key = self.key(value)
        item = self._items.get(key)
        if not item or item[0] <= time.monotonic():
            self._items.pop(key, None)
            return None
        return item[1].copy()

    def set(self, value, result):
        if len(self._items) >= self.max_items:
            oldest = min(self._items, key=lambda key: self._items[key][0])
            self._items.pop(oldest, None)
        self._items[self.key(value)] = (time.monotonic() + self.ttl_seconds, result.copy())
