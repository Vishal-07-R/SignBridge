"""Rate limiting service with Redis sliding window and in-memory fallback."""

import logging
import time
from collections import defaultdict
from collections.abc import Awaitable, Callable

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Fallback in-memory store: key -> list of timestamps
_memory_store: dict[str, list[float]] = defaultdict(list)
_redis_client: aioredis.Redis | None = None


async def get_redis_client() -> aioredis.Redis | None:
    """Get or initialize singleton Redis async connection."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        try:
            client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=2.0,
            )
            await client.ping()
            _redis_client = client
        except Exception as exc:
            logger.warning("Redis connection failed (%s); using in-memory rate limiting", exc)
            return None
    return _redis_client


async def clear_rate_limits() -> None:
    """Clear in-memory and Redis rate limiting keys (useful between test runs)."""
    global _memory_store
    _memory_store.clear()
    client = await get_redis_client()
    if client:
        try:
            keys = await client.keys("rl:*")
            if keys:
                await client.delete(*keys)
        except Exception:
            pass


def rate_limit(
    rule_or_limit: str | int,
    window_seconds: int = 60,
    prefix: str | None = None,
) -> Callable[[Request], Awaitable[None]]:
    """Dependency factory dynamically resolving limits from app settings."""

    async def limiter(request: Request) -> None:
        settings = getattr(request.app.state, "settings", None) or get_settings()

        if isinstance(rule_or_limit, int):
            max_requests = rule_or_limit
            rule_name = prefix or f"custom_{max_requests}"
        elif rule_or_limit == "login":
            max_requests = settings.RATE_LIMIT_LOGIN_PER_MINUTE
            rule_name = "login"
        elif rule_or_limit == "register":
            max_requests = settings.RATE_LIMIT_REGISTER_PER_MINUTE
            rule_name = "register"
        elif rule_or_limit == "forgot_password":
            max_requests = settings.RATE_LIMIT_FORGOT_PASSWORD_PER_MINUTE
            rule_name = "forgot_password"
        else:
            max_requests = 100
            rule_name = str(rule_or_limit)

        effective_prefix = prefix or f"rl:{rule_name}"

        client_ip = request.headers.get("x-forwarded-for") or (
            request.client.host if request.client else "127.0.0.1"
        )
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()

        key = f"{effective_prefix}:{client_ip}"
        now = time.time()
        window_start = now - window_seconds

        client = await get_redis_client()
        if client:
            try:
                # Redis sorted set sliding window
                pipe = client.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, window_seconds + 5)
                results = await pipe.execute()
                current_count = results[2]
                if current_count > max_requests:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again later.",
                        headers={"Retry-After": str(window_seconds)},
                    )
                return
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("Redis error during rate limiting (%s); falling back to memory", exc)

        # In-memory sliding window fallback
        timestamps = [t for t in _memory_store[key] if t > window_start]
        timestamps.append(now)
        _memory_store[key] = timestamps
        if len(timestamps) > max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return limiter
