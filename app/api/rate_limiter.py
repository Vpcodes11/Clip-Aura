"""Production rate limiting for Clip Aura.

Provides IP-based and user-based rate limiters with burst protection,
fail-closed behavior, and proper 429 responses with Retry-After headers.

Rate limit tiers:
  - strict:    3/min  (retry endpoints, expensive operations)
  - standard:  10/min (downloads, preview generation)
  - moderate:  30/min (job listings, status polling)
  - generous:  120/min (me, presets)
  - ws_connect: 10/min (websocket connections per IP)
"""

import logging
import time
from typing import Optional, Tuple

from fastapi import HTTPException, Request, WebSocket

from app.config import get_redis_async

logger = logging.getLogger("clipaura.ratelimit")


async def _redis_check(key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
    """Core Redis rate check. Returns (allowed, remaining). Fails closed."""
    try:
        r = get_redis_async()
        current = await r.get(key)
        if current is None:
            await r.set(key, 1, ex=window_seconds)
            return True, limit - 1

        count = int(current)
        remaining = max(0, limit - count)

        if count >= limit:
            return False, 0

        await r.incr(key)
        return True, remaining - 1

    except Exception as exc:
        logger.error("Rate limiter Redis failure — failing closed", extra={
            "_structured_fields": {"key": key, "error": str(exc)}
        })
        raise HTTPException(
            status_code=503,
            detail="Rate limiting is temporarily unavailable. Please try again later.",
        )


def _rate_limit_key(prefix: str, identifier: str) -> str:
    return f"rl:{prefix}:{identifier}"


async def rate_limit_by_user(
    user_id: str,
    endpoint: str,
    limit: int,
    window_seconds: int = 60,
) -> None:
    """Enforce a user-scoped rate limit. Raises 429 on violation."""
    key = _rate_limit_key(f"user:{endpoint}", user_id)
    allowed, remaining = await _redis_check(key, limit, window_seconds)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for {endpoint}. Try again shortly.",
            headers={"Retry-After": str(window_seconds)},
        )


async def rate_limit_by_ip(
    request: Request,
    endpoint: str,
    limit: int,
    window_seconds: int = 60,
) -> None:
    """Enforce an IP-scoped rate limit. Raises 429 on violation."""
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",", 1)[0].strip() or (
        request.client.host if request.client else "unknown"
    )
    key = _rate_limit_key(f"ip:{endpoint}", ip)
    allowed, remaining = await _redis_check(key, limit, window_seconds)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for {endpoint}. Try again shortly.",
            headers={"Retry-After": str(window_seconds)},
        )


# ---- Convenience functions for common endpoint profiles ----

async def rate_limit_standard(user_id: str, endpoint: str) -> None:
    await rate_limit_by_user(user_id, endpoint, limit=30, window_seconds=60)


async def rate_limit_expensive(user_id: str, endpoint: str) -> None:
    await rate_limit_by_user(user_id, endpoint, limit=5, window_seconds=60)


async def rate_limit_strict(user_id: str, endpoint: str) -> None:
    await rate_limit_by_user(user_id, endpoint, limit=3, window_seconds=60)


async def rate_limit_ws_connect(ws_or_request) -> None:
    forwarded = ""
    client_ip = "unknown"
    if hasattr(ws_or_request, "headers"):
        forwarded = ws_or_request.headers.get("x-forwarded-for", "")
        if hasattr(ws_or_request, "client") and ws_or_request.client:
            client_ip = ws_or_request.client.host
    ip = forwarded.split(",", 1)[0].strip() or client_ip
    await rate_limit_by_ip_raw(ip, "ws_connect", limit=10, window_seconds=60)


async def rate_limit_by_ip_raw(ip: str, endpoint: str, limit: int, window_seconds: int = 60) -> None:
    key = _rate_limit_key(f"ip:{endpoint}", ip)
    allowed, remaining = await _redis_check(key, limit, window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for {endpoint}. Try again shortly.",
            headers={"Retry-After": str(window_seconds)},
        )


async def rate_limit_api_read(user_id: str, endpoint: str) -> None:
    await rate_limit_by_user(user_id, endpoint, limit=120, window_seconds=60)
