from typing import Any

from fastapi import Header


async def get_api_key(x_api_key: str | None = Header(default=None)) -> str | None:
    if x_api_key:
        return x_api_key
    return None


def filter_sensitive_data(data: dict[str, Any]) -> dict[str, Any]:
    filtered = data.copy()
    for field in ["password", "token", "api_key", "authorization"]:
        if field in filtered:
            filtered[field] = "[REDACTED]"
    return filtered
