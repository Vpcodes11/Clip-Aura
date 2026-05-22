import os
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"


def test_check_env_contract_no_dotenv(tmp_path):
    result = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "check_env_contract.py"), "--env-file", str(tmp_path / ".env")],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert ".env not found" in result.stdout


def test_check_env_contract_all_present(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "GROQ_API_KEY=gsk_test123",
                "SUPABASE_URL=https://example.supabase.co",
                "SUPABASE_ANON_KEY=eyJtest123",
                "SUPABASE_JWT_SECRET=jwt-secret-123",
                "STRIPE_SECRET_KEY=sk_test_abc",
                "STRIPE_WEBHOOK_SECRET=whsec_xyz",
                "STRIPE_PRO_PRICE_ID=price_abc",
                "REDIS_PASSWORD=devpass",
                "DATABASE_URL=postgresql://localhost/test",
            ]
        )
    )
    result = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "check_env_contract.py"), "--env-file", str(env_file)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert "All required keys are present" in result.stdout
    assert "MISSING" not in result.stdout


def test_check_env_contract_missing_key(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "GROQ_API_KEY=gsk_test123",
                "SUPABASE_URL=https://example.supabase.co",
            ]
        )
    )
    result = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "check_env_contract.py"), "--env-file", str(env_file)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert "MISSING REQUIRED KEYS" in result.stdout


def test_check_env_contract_no_secrets_leaked(tmp_path):
    env_file = tmp_path / ".env"
    secret_groq = "gsk_myRealSecretKey123"
    env_file.write_text(
        "\n".join(
            [
                "GROQ_API_KEY={}".format(secret_groq),
                "SUPABASE_URL=https://example.supabase.co",
                "SUPABASE_ANON_KEY=eyJmyRealAnonKey",
                "SUPABASE_JWT_SECRET=my-jwt-secret-real",
                "STRIPE_SECRET_KEY=sk_test_realStripeKey",
                "STRIPE_WEBHOOK_SECRET=whsec_realWebhook",
                "STRIPE_PRO_PRICE_ID=price_real",
                "REDIS_PASSWORD=realRedisPass",
                "DATABASE_URL=postgresql://user:realpass@host/db",
            ]
        )
    )
    result = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "check_env_contract.py"), "--env-file", str(env_file)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    stdout = result.stdout
    assert secret_groq not in stdout
    assert "realStripeKey" not in stdout
    assert "realRedisPass" not in stdout
    assert "realpass" not in stdout
    assert "myRealAnonKey" not in stdout
    assert stdout.count("PRESENT") >= 9
