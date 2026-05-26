"""
CORS Hardening Tests
====================
Validates that the FastAPI CORSMiddleware is configured with a strict
allowlist for origins, headers, and methods.  Each test sends an OPTIONS
preflight request and inspects the response headers.
"""

import os

os.environ.setdefault('ENVIRONMENT', 'development')
os.environ.setdefault('DEV_MODE', 'true')
os.environ.setdefault('SUPABASE_URL', 'https://dummyprojectref.supabase.co')
os.environ.setdefault('SUPABASE_ANON_KEY', 'dummy-anon-key')
os.environ.setdefault('PREVIEW_SIGNING_SECRET', 'a' * 32)
os.environ.setdefault('LEAD_HASH_SALT', 'b' * 16)
os.environ.setdefault('DATABASE_URL', 'sqlite:///./runtime/db/clip_aura_test.db')

import pytest
from fastapi.testclient import TestClient
from app.api.main import app

client = TestClient(app)

PREFLIGHT_HEADERS_BASE = {
    "Access-Control-Request-Method": "GET",
}


# ── Origin tests ─────────────────────────────────────────────────────

def test_cors_allowed_origin():
    """Verify that a preflight request from an explicitly allowed origin
    (http://localhost:3000) receives the correct Access-Control-Allow-Origin
    header in the response."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            **PREFLIGHT_HEADERS_BASE,
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_disallowed_origin():
    """Verify that a preflight request from an unknown origin
    (http://evil.com) does NOT receive Access-Control-Allow-Origin
    set to that origin, preventing cross-origin access."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://evil.com",
            **PREFLIGHT_HEADERS_BASE,
        },
    )
    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin != "http://evil.com", (
        f"Disallowed origin http://evil.com was reflected back: {allow_origin}"
    )


# ── Header tests ─────────────────────────────────────────────────────

def test_cors_allowed_headers():
    """Verify that the preflight response advertises all expected headers
    (Authorization, Content-Type, Accept, X-Request-ID, X-Correlation-ID)
    in Access-Control-Allow-Headers."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type, Accept, X-Request-ID, X-Correlation-ID",
        },
    )
    raw = response.headers.get("access-control-allow-headers", "")
    allowed = {h.strip().lower() for h in raw.split(",")}

    for expected in ("authorization", "content-type", "accept", "x-request-id", "x-correlation-id"):
        assert expected in allowed, f"Expected header '{expected}' not found in allowed headers: {raw}"


def test_cors_disallowed_header():
    """Verify that an arbitrary non-allowlisted header (X-Custom-Evil)
    is NOT present in the Access-Control-Allow-Headers response, ensuring
    the middleware does not echo back arbitrary header requests."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-Custom-Evil",
        },
    )
    raw = response.headers.get("access-control-allow-headers", "")
    allowed = {h.strip().lower() for h in raw.split(",") if h.strip()}

    assert "x-custom-evil" not in allowed, (
        f"Unexpected header 'X-Custom-Evil' was allowed: {raw}"
    )


# ── Method tests ─────────────────────────────────────────────────────

def test_cors_allowed_methods():
    """Verify that Access-Control-Allow-Methods includes GET, POST, and
    DELETE but does NOT include PATCH, which is intentionally omitted
    from the middleware configuration."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    raw = response.headers.get("access-control-allow-methods", "")
    allowed = {m.strip().upper() for m in raw.split(",")}

    for expected in ("GET", "POST", "DELETE"):
        assert expected in allowed, f"Expected method '{expected}' not found in allowed methods: {raw}"

    assert "PATCH" not in allowed, f"PATCH should NOT be in allowed methods: {raw}"


# ── Credentials test ─────────────────────────────────────────────────

def test_cors_credentials():
    """Verify that Access-Control-Allow-Credentials is 'true' when the
    request comes from an allowed origin, confirming the middleware
    permits credentialed cross-origin requests."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            **PREFLIGHT_HEADERS_BASE,
        },
    )
    assert response.headers.get("access-control-allow-credentials") == "true", (
        "Expected access-control-allow-credentials to be 'true' for allowed origins"
    )
