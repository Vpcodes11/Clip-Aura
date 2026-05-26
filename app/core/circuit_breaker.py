"""Circuit breaker for external AI providers.

Tracks consecutive failures per provider in Redis. When a circuit opens,
tasks auto-fallback to the alternate provider instead of failing.

State transitions:
  CLOSED → OPEN   after N consecutive failures
  OPEN   → HALF    after M seconds cooldown
  HALF   → CLOSED on first success
  HALF   → OPEN   on first failure (reopens)
"""

import time
import logging

logger = logging.getLogger(__name__)

CIRCUIT_FAILURE_THRESHOLD = 5
CIRCUIT_COOLDOWN_SECONDS = 60


class CircuitBreaker:
    """Track provider health via Redis. Falls back gracefully when a circuit is open."""

    def __init__(self, redis_client):
        self.redis = redis_client

    def _circuit_key(self, provider: str) -> str:
        return f"ai_circuit:{provider}"

    def record_failure(self, provider: str) -> None:
        """Record a failure for a provider. Opens circuit if threshold reached."""
        key = self._circuit_key(provider)
        try:
            count = self.redis.incr(key)
            if count == 1:
                self.redis.expire(key, CIRCUIT_COOLDOWN_SECONDS * 2)
            if count >= CIRCUIT_FAILURE_THRESHOLD:
                self.redis.set(f"{key}:open", str(time.time()))
                logger.warning("Circuit BREAKER OPEN for provider=%s after %s consecutive failures", provider, count)
        except Exception:
            pass

    def record_success(self, provider: str) -> None:
        """Reset failure count on success. Closes half-open circuit."""
        key = self._circuit_key(provider)
        try:
            self.redis.delete(key, f"{key}:open")
            if self.redis.exists(f"{key}:open"):
                logger.info("Circuit BREAKER CLOSED for provider=%s after successful probe", provider)
        except Exception:
            pass

    def is_open(self, provider: str) -> bool:
        """Check if circuit is open. Returns True = use fallback."""
        try:
            return bool(self.redis.exists(f"{self._circuit_key(provider)}:open"))
        except Exception:
            return False

    def status(self, provider: str) -> dict:
        """Get circuit breaker status for diagnostics."""
        try:
            count = int(self.redis.get(self._circuit_key(provider)) or 0)
            is_open = bool(self.redis.exists(f"{self._circuit_key(provider)}:open"))
            opened_ts = self.redis.get(f"{self._circuit_key(provider)}:open")
            opened_at = float(opened_ts) if opened_ts else None
            return {
                "provider": provider,
                "open": is_open,
                "consecutive_failures": count,
                "threshold": CIRCUIT_FAILURE_THRESHOLD,
                "opened_at": opened_at,
                "cooldown_seconds": CIRCUIT_COOLDOWN_SECONDS,
            }
        except Exception:
            return {"provider": provider, "open": False, "consecutive_failures": 0, "error": "redis_unavailable"}

    def should_fallback(self, provider: str, fallback_provider: str) -> str | None:
        """Return fallback provider name if primary circuit is open, else None."""
        if provider and fallback_provider and self.is_open(provider):
            logger.warning("Circuit open for provider=%s, falling back to %s", provider, fallback_provider)
            return fallback_provider
        return None
