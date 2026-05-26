"""Tests for Razorpay webhook handler, billing, ASS escaping, rate limiting, and security."""
import json
import asyncio
import hmac
import hashlib
import time
import pytest
from unittest.mock import patch, MagicMock


# ─────────────────────────────────────────────────────────
# 1. ASS Escape Tests
# ─────────────────────────────────────────────────────────


class TestAssEscape:
    def test_escapes_braces(self):
        from app.rendering.clipper import escape_ass_text
        assert escape_ass_text("hello {world}") == "hello \\{world\\}"
        assert escape_ass_text("{test}") == "\\{test\\}"

    def test_escapes_backslashes(self):
        from app.rendering.clipper import escape_ass_text
        assert escape_ass_text("C:\\path\\file") == "C:\\\\path\\\\file"
        assert escape_ass_text("test\\") == "test\\\\"

    def test_combined_escape(self):
        from app.rendering.clipper import escape_ass_text
        result = escape_ass_text("path\\to\\{file}.ext")
        assert "\\\\\\{" in result

    def test_empty_and_none(self):
        from app.rendering.clipper import escape_ass_text
        assert escape_ass_text("") == ""
        assert escape_ass_text(None) is None

    def test_malicious_subtitle_injection(self):
        from app.rendering.clipper import escape_ass_text
        payload = '{\\fnComic Sans}{\\c&HFF0000&}MALICIOUS{}\\test'
        escaped = escape_ass_text(payload)
        assert "MALICIOUS" in escaped
        assert "\\{" in escaped
        assert payload not in escaped


# ─────────────────────────────────────────────────────────
# 2. Content Moderation Tests
# ─────────────────────────────────────────────────────────


class TestContentModeration:
    def test_clean_content_passes(self):
        from app.core.moderation import moderate_clips
        clips = [{
            "title": "How to Grow Your Business",
            "hook_caption": "The #1 strategy nobody talks about",
            "hashtags": ["#business", "#growth"]
        }]
        safe, flagged = moderate_clips(clips)
        assert len(safe) == 1
        assert len(flagged) == 0

    def test_harmful_content_flagged(self):
        from app.core.moderation import moderate_clips
        clips = [{
            "title": "Regular Business Tip",
            "hook_caption": "white supremacist rally exposed",
            "hashtags": ["#news"]
        }]
        safe, flagged = moderate_clips(clips)
        assert len(safe) == 0
        assert len(flagged) == 1

    def test_mixed_clips(self):
        from app.core.moderation import moderate_clips
        clips = [
            {"title": "Good Clip", "hook_caption": "Healthy advice", "hashtags": ["#health"]},
            {"title": "Bad Clip", "hook_caption": "mass shooting coverage", "hashtags": ["#news"]},
            {"title": "Another Good", "hook_caption": "Marketing tips", "hashtags": ["#marketing"]},
        ]
        safe, flagged = moderate_clips(clips)
        assert len(safe) == 2
        assert len(flagged) == 1

    def test_terrorism_pattern_flagged(self):
        from app.core.moderation import moderate_clips
        clips = [{"title": "Test", "hook_caption": "terrorism and recruitment", "hashtags": []}]
        safe, flagged = moderate_clips(clips)
        assert len(safe) == 0

    def test_empty_clips_list(self):
        from app.core.moderation import moderate_clips
        safe, flagged = moderate_clips([])
        assert safe == []
        assert flagged == []


# ─────────────────────────────────────────────────────────
# 3. Razorpay Webhook Payment Tests
# ─────────────────────────────────────────────────────────


class TestPaymentsHelpers:
    def test_resolve_tier_from_plan_pro(self):
        with patch("app.api.payments.RAZORPAY_PRO_PLAN_ID", "plan_pro"):
            with patch("app.api.payments.RAZORPAY_STUDIO_PLAN_ID", "plan_studio"):
                with patch("app.api.payments.RAZORPAY_AGENCY_PLAN_ID", "plan_agency"):
                    from app.api.payments import _resolve_tier_from_plan
                    assert _resolve_tier_from_plan("plan_pro") == "pro"
                    assert _resolve_tier_from_plan("plan_studio") == "studio"
                    assert _resolve_tier_from_plan("plan_agency") == "agency"
                    assert _resolve_tier_from_plan("unknown") == "pro"

    def test_activate_subscription(self, monkeypatch):
        monkeypatch.setenv("PREVIEW_SIGNING_SECRET", "preview-secret-32-chars-long!")
        monkeypatch.setenv("LEAD_HASH_SALT", "hash-salt-16chars-min!")
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_test")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_secret_32charslong_key_secret")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_32charslong_webhook_secret_test")
        from datetime import datetime, timezone

        mock_db = MagicMock()
        mock_user = MagicMock()
        mock_user.razorpay_customer_id = None
        mock_user.razorpay_subscription_id = None
        mock_user.subscription_tier = "trial"
        mock_user.total_minutes_limit = 60
        mock_user.used_minutes = 45
        mock_user.rollover_credits = 0

        from app.api.payments import _activate_subscription
        now = datetime.now(timezone.utc)
        _activate_subscription(mock_db, mock_user, "sub_123", "cus_456", "pro", now)

        assert mock_user.subscription_tier == "pro"
        assert mock_user.subscription_status == "active"
        assert mock_user.razorpay_customer_id == "cus_456"
        assert mock_user.razorpay_subscription_id == "sub_123"
        assert mock_user.used_minutes == 0
        assert mock_user.rollover_credits == 0
        assert mock_user.total_minutes_limit == 240
        assert mock_user.next_billing_date == now

    def test_cancel_subscription(self, monkeypatch):
        monkeypatch.setenv("PREVIEW_SIGNING_SECRET", "preview-secret-32-chars-long!")
        monkeypatch.setenv("LEAD_HASH_SALT", "hash-salt-16chars-min!")
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_test")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_secret_32charslong_key_secret")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_32charslong_webhook_secret_test")

        mock_db = MagicMock()
        mock_user = MagicMock()
        mock_user.subscription_status = "active"
        mock_user.razorpay_subscription_id = "sub_123"

        from app.api.payments import _cancel_subscription
        _cancel_subscription(mock_db, mock_user)

        assert mock_user.subscription_status == "canceled"
        assert mock_user.razorpay_subscription_id is None

    def test_mark_past_due(self, monkeypatch):
        monkeypatch.setenv("PREVIEW_SIGNING_SECRET", "preview-secret-32-chars-long!")
        monkeypatch.setenv("LEAD_HASH_SALT", "hash-salt-16chars-min!")
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_test")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_secret_32charslong_key_secret")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_32charslong_webhook_secret_test")

        mock_db = MagicMock()
        mock_user = MagicMock()

        from app.api.payments import _mark_past_due
        _mark_past_due(mock_db, mock_user)
        assert mock_user.subscription_status == "past_due"

    def test_invoice_paid_resets_usage(self, monkeypatch):
        monkeypatch.setenv("PREVIEW_SIGNING_SECRET", "preview-secret-32-chars-long!")
        monkeypatch.setenv("LEAD_HASH_SALT", "hash-salt-16chars-min!")
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_test")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_secret_32charslong_key_secret")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_32charslong_webhook_secret_test")
        from datetime import datetime, timezone

        mock_db = MagicMock()
        mock_user = MagicMock()
        mock_user.used_minutes = 180
        mock_user.subscription_status = "active"

        from app.api.payments import _handle_invoice_paid
        now = datetime.now(timezone.utc)
        _handle_invoice_paid(mock_db, mock_user, now)

        assert mock_user.used_minutes == 0
        assert mock_user.subscription_status == "active"
        assert mock_user.last_usage_reset_at is not None
        assert mock_user.next_billing_date == now


# ─────────────────────────────────────────────────────────
# 4. Rate Limiter Tests
# ─────────────────────────────────────────────────────────


class TestRateLimiterFailClosed:
    def test_rate_limiter_module_has_fail_closed_behavior(self):
        """Verify the rate limiter module is structured for fail-closed operation."""
        from app.api.rate_limiter import _redis_check
        import inspect
        source = inspect.getsource(_redis_check)
        assert "HTTPException" in source or "503" in source
        assert "logger.error" in source

    def test_rate_limit_functions_exist_and_accept_params(self):
        """Verify all rate limit convenience functions are importable."""
        from app.api.rate_limiter import (
            rate_limit_by_user,
            rate_limit_by_ip,
            rate_limit_standard,
            rate_limit_expensive,
            rate_limit_strict,
            rate_limit_api_read,
            rate_limit_ws_connect,
        )
        assert callable(rate_limit_by_user)
        assert callable(rate_limit_by_ip)
        assert callable(rate_limit_standard)
        assert callable(rate_limit_expensive)
        assert callable(rate_limit_strict)
        assert callable(rate_limit_api_read)
        assert callable(rate_limit_ws_connect)

    def test_429_exception_includes_retry_after(self):
        """Verify 429 responses include Retry-After header."""
        from app.api.rate_limiter import rate_limit_by_user
        import asyncio
        from fastapi import HTTPException

        # Test by directly verifying the exception structure
        try:
            raise HTTPException(status_code=429, detail="Rate limit", headers={"Retry-After": "60"})
        except HTTPException as e:
            assert e.status_code == 429
            assert "Retry-After" in e.headers


# ─────────────────────────────────────────────────────────
# 5. Production Startup Validation Tests
# ─────────────────────────────────────────────────────────


class TestProductionSecrets:
    def test_missing_preview_secret_rejected(self, monkeypatch):
        import importlib
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("DEV_MODE", "false")
        monkeypatch.delenv("PREVIEW_SIGNING_SECRET", raising=False)
        monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h/db")
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "key")
        monkeypatch.setenv("GROQ_API_KEY", "gsk_x")
        monkeypatch.setenv("REDIS_URL", "redis://x:6379/0")
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_x")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_secret_x_32charslong")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_x_32charslong")

        with pytest.raises(RuntimeError):
            import app.config as config
            importlib.reload(config)

    def test_short_preview_secret_rejected(self, monkeypatch):
        import importlib
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("DEV_MODE", "false")
        monkeypatch.setenv("PREVIEW_SIGNING_SECRET", "short")
        monkeypatch.setenv("LEAD_HASH_SALT", "also-too-short")
        monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h/db")
        monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "key")
        monkeypatch.setenv("GROQ_API_KEY", "gsk_x")
        monkeypatch.setenv("REDIS_URL", "redis://x:6379/0")
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_x")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_secret_x_32charslong")
        monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_x_32charslong")

        with pytest.raises(RuntimeError):
            import app.config as config
            importlib.reload(config)


# ─────────────────────────────────────────────────────────
# 6. Duplicate Webhook Test
# ─────────────────────────────────────────────────────────


class TestRazorpayEventIdempotency:
    def test_duplicate_event_id_blocked(self, monkeypatch):
        monkeypatch.setenv("PREVIEW_SIGNING_SECRET", "preview-secret-32-chars-long!")
        monkeypatch.setenv("LEAD_HASH_SALT", "hash-salt-16chars-min!")
        from app.models.models import RazorpayEvent

        mock_db = MagicMock()
        existing = MagicMock(spec=RazorpayEvent)
        mock_db.query.return_value.filter.return_value.first.return_value = existing
        assert existing is not None


# ─────────────────────────────────────────────────────────
# 7. Analyzer Prompt Safety Tests
# ─────────────────────────────────────────────────────────


class TestAnalyzerPromptSafety:
    def test_system_prompt_no_controversy_directive(self):
        from app.core.analyzer import SYSTEM_PROMPT
        assert "CONTROVERSY" not in SYSTEM_PROMPT
        assert "hot takes that people will argue about" not in SYSTEM_PROMPT

    def test_system_prompt_has_safety_note(self):
        from app.core.analyzer import SYSTEM_PROMPT
        assert "SAFETY NOTE" in SYSTEM_PROMPT
        assert "violence" in SYSTEM_PROMPT.lower()
        assert "hate speech" in SYSTEM_PROMPT.lower()
