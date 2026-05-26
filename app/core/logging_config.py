"""Structured JSON logging for Clip Aura.

Replaces all print() usage with JSON-formatted log records that include
request IDs, correlation IDs, user IDs, task IDs, and sanitized context.

Configuration is driven by environment variables:
  LOG_LEVEL       (default: INFO)
  LOG_FORMAT      json | text  (default: json in production, text in dev)
  SENTRY_DSN      (optional) enable Sentry error tracking
  OTEL_EXPORTER_OTLP_ENDPOINT  (optional) OpenTelemetry endpoint
"""

import json
import logging
import os
import sys
import time
import uuid
import traceback
from contextvars import ContextVar
from typing import Any, Dict, Optional

# Context variables for request-scoped enrichment
_request_id_var: ContextVar[str] = ContextVar("request_id", default="")
_user_id_var: ContextVar[str] = ContextVar("user_id", default="")
_task_id_var: ContextVar[str] = ContextVar("task_id", default="")
_correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")

# Redacted field names — values matching these keys are truncated to their prefix
REDACT_KEYS = {
    "authorization", "access_token", "token", "api_key", "api-key",
    "secret", "password", "jwt", "signing_secret", "s3_secret_key",
    "stripe_secret_key", "stripe_webhook_secret", "redis_password",
    "anon_key", "service_role_key",
}
REDACT_PREFIX_LEN = 8

# Fields whose values should never appear in logs (empty or [REDACTED])
BLOCK_KEYS = {
    "authorization", "cookie", "set-cookie",
}


def _should_redact_key(key: str) -> bool:
    lowered = key.lower().replace("-", "_")
    return any(redact in lowered for redact in REDACT_KEYS)


def _should_block_key(key: str) -> bool:
    return key.lower() in BLOCK_KEYS


def sanitize_dict(obj: Dict[str, Any]) -> Dict[str, Any]:
    """Deep-sanitize a dict: redact PII, truncate large values, block known secrets."""
    if not isinstance(obj, dict):
        return obj
    result = {}
    for k, v in obj.items():
        if _should_block_key(k):
            result[k] = "[REDACTED]"
        elif _should_redact_key(k):
            if isinstance(v, str) and len(v) > REDACT_PREFIX_LEN:
                result[k] = v[:REDACT_PREFIX_LEN] + "..."
            else:
                result[k] = v
        elif isinstance(v, dict):
            result[k] = sanitize_dict(v)
        elif isinstance(v, list):
            result[k] = [sanitize_dict(item) if isinstance(item, dict) else item for item in v]
        elif isinstance(v, str) and len(v) > 4096:
            result[k] = v[:4096] + "...[truncated]"
        else:
            result[k] = v
    return result


class StructuredFormatter(logging.Formatter):
    """JSON log formatter with automatic sanitization."""

    def __init__(self, use_json: bool = True):
        super().__init__()
        self.use_json = use_json

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": time.time(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = {
                "type": type(record.exc_info[1]).__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        req_id = _request_id_var.get()
        if req_id:
            log_entry["request_id"] = req_id

        user_id = _user_id_var.get()
        if user_id:
            log_entry["user_id"] = user_id

        task_id = _task_id_var.get()
        if task_id:
            log_entry["task_id"] = task_id

        corr_id = _correlation_id_var.get()
        if corr_id:
            log_entry["correlation_id"] = corr_id

        extra_fields = getattr(record, '_structured_fields', None)
        if extra_fields and isinstance(extra_fields, dict):
            log_entry["extra"] = sanitize_dict(extra_fields)

        if self.use_json:
            return json.dumps(log_entry, default=str)
        else:
            parts = [f"{record.levelname:<8} {record.name}"]
            if req_id:
                parts.append(f"[{req_id[:8]}]")
            if user_id:
                parts.append(f"[user={user_id[:8]}]")
            parts.append(record.getMessage())
            if record.exc_info and record.exc_info[1]:
                parts.append(f"| {type(record.exc_info[1]).__name__}: {record.exc_info[1]}")
            return " ".join(parts)


def setup_logging(level: Optional[str] = None, use_json: Optional[bool] = None) -> None:
    """Initialize structured logging globally.

    Called once at application startup (config.py or main.py).
    """
    if level is None:
        level = os.getenv("LOG_LEVEL", "INFO")
    if use_json is None:
        is_prod = os.getenv("ENVIRONMENT", "development").lower() in ("production", "prod")
        use_json = os.getenv("LOG_FORMAT", "json" if is_prod else "text") == "json"

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove any existing handlers
    for h in root.handlers[:]:
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(StructuredFormatter(use_json=use_json))
    root.addHandler(handler)

    # Suppress noisy third-party loggers
    for noisy in ("celery.redirected", "kombu", "httpx", "httpcore", "urllib3", "boto3", "botocore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    root.info("Structured logging initialized", extra={
        "_structured_fields": {
            "log_level": level,
            "log_format": "json" if use_json else "text",
        }
    })


# ---- Context helpers ----

def set_request_context(request_id: Optional[str] = None, user_id: Optional[str] = None,
                        correlation_id: Optional[str] = None) -> None:
    """Set context vars for the current request/async context."""
    if request_id:
        _request_id_var.set(request_id)
    if user_id:
        _user_id_var.set(user_id)
    if correlation_id:
        _correlation_id_var.set(correlation_id)
    else:
        _correlation_id_var.set(str(uuid.uuid4()))

def clear_request_context() -> None:
    _request_id_var.set("")
    _user_id_var.set("")
    _task_id_var.set("")
    _correlation_id_var.set("")

def set_task_context(task_id: str) -> None:
    _task_id_var.set(task_id)
    _correlation_id_var.set(str(uuid.uuid4()))

# ---- Structured log helpers ----

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def log_event(logger: logging.Logger, level: str, message: str, **extra: Any) -> None:
    record = logging.LogRecord(
        name=logger.name,
        level=getattr(logging, level.upper()),
        pathname="",
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record._structured_fields = extra  # type: ignore[attr-defined]
    logger.handle(record)


# ---- Sentry integration ----

_sentry_initialized = False

def setup_sentry() -> None:
    """Initialize Sentry error tracking if SENTRY_DSN is configured."""
    global _sentry_initialized
    if _sentry_initialized:
        return

    dsn = os.getenv("SENTRY_DSN", "")
    if not dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=os.getenv("ENVIRONMENT", "development"),
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1")),
            integrations=[
                CeleryIntegration(),
                LoggingIntegration(level=logging.WARNING, event_level=logging.ERROR),
            ],
            before_send=_sentry_before_send,
        )
        _sentry_initialized = True
        logging.getLogger(__name__).info("Sentry initialized")
    except ImportError:
        logging.getLogger(__name__).warning("Sentry SDK not installed — skipping Sentry setup")
    except Exception as exc:
        logging.getLogger(__name__).warning("Sentry setup failed: %s", exc)


def _sentry_before_send(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Sanitize PII from Sentry events before sending."""
    if "request" in event:
        req = event["request"]
        if "headers" in req:
            req["headers"] = sanitize_dict(dict(req["headers"]))
        if "cookies" in req:
            req.pop("cookies", None)
        if "query_string" in req:
            req.pop("query_string", None)
    if "user" in event:
        user = event["user"]
        safe_keys = {"id"}
        event["user"] = {k: v for k, v in user.items() if k in safe_keys}
    return event


# ---- OpenTelemetry hooks ----

_otel_initialized = False

def setup_opentelemetry() -> None:
    """Initialize OpenTelemetry if OTLP endpoint is configured."""
    global _otel_initialized
    if _otel_initialized:
        return

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    if not endpoint:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.celery import CeleryInstrumentor
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        provider = TracerProvider()
        exporter = OTLPSpanExporter(endpoint=endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        CeleryInstrumentor().instrument()
        _otel_initialized = True
        logging.getLogger(__name__).info("OpenTelemetry initialized")
    except ImportError:
        logging.getLogger(__name__).warning("OpenTelemetry SDK not installed — skipping OTel setup")
    except Exception as exc:
        logging.getLogger(__name__).warning("OpenTelemetry setup failed: %s", exc)
