"""FastAPI middleware for request tracing, structured logging, and security headers."""

import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging_config import set_request_context, clear_request_context, get_logger

logger = get_logger(__name__)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        user_id = None

        # Extract user_id from auth header if present (for early logging)
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                token = auth[7:]
                # Skip Supabase lookup for dev-token to avoid wasted API calls
                from app.config import DEV_MODE
                if DEV_MODE and token == "dev-token":
                    user_id = "00000000-0000-0000-0000-000000000000"
                else:
                    from app.api.auth import get_supabase_client
                    res = get_supabase_client().auth.get_user(token)
                    if res.user:
                        user_id = res.user.id
            except Exception:
                pass

        set_request_context(request_id=request_id, user_id=user_id,
                            correlation_id=correlation_id)

        start = time.monotonic()
        response = None
        try:
            response = await call_next(request)
        except Exception as exc:
            elapsed = time.monotonic() - start
            response = Response(
                content='{"detail":"Internal Server Error"}',
                status_code=500,
                media_type="application/json",
            )
            setattr(response, "_logged_exception", True)
        finally:
            elapsed = time.monotonic() - start
            if response is None:
                response = Response(status_code=500)

            for header, value in SECURITY_HEADERS.items():
                response.headers.setdefault(header, value)
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Correlation-ID"] = correlation_id

            status = response.status_code
            if status >= 500:
                logger.error(
                    "Request completed",
                    extra={
                        "_structured_fields": {
                            "method": request.method,
                            "path": request.url.path,
                            "status": status,
                            "duration_ms": round(elapsed * 1000, 2),
                            "client_ip": request.client.host if request.client else "unknown",
                        }
                    },
                )
            elif status >= 400:
                logger.warning(
                    "Request completed",
                    extra={
                        "_structured_fields": {
                            "method": request.method,
                            "path": request.url.path,
                            "status": status,
                            "duration_ms": round(elapsed * 1000, 2),
                            "client_ip": request.client.host if request.client else "unknown",
                        }
                    },
                )

            clear_request_context()

        return response
