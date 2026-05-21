import requests
import os
import sys
import subprocess

def check_backend():
    print("[*] Checking Backend (FastAPI)...")
    try:
        response = requests.get("http://localhost:8000/api/presets")
        if response.status_code == 200:
            print("[OK] Backend is ALIVE and responding.")
            return True
        else:
            print(f"[ERROR] Backend returned error: {response.status_code}")
    except Exception as e:
        print(f"[OFFLINE] Backend is OFFLINE. (Make sure main.py is running)")
    return False

def check_database():
    print("\n[*] Checking Database Connection...")
    # This is a bit more complex since we use SQLAlchemy, but we can check the .db file or env
    db_url = os.getenv("DATABASE_URL")
    if db_url and "[YOUR_PASSWORD]" not in db_url:
        print("[OK] Production PostgreSQL detected in .env")
    elif os.path.exists("clip_aura.db"):
        print("[OK] Local SQLite database found.")
    else:
        print("[WARN] No database found. (Run the backend once to initialize)")

def check_celery():
    print("\n[*] Checking AI Worker (Celery)...")
    try:
        # We try to ping the worker via the celery CLI
        result = subprocess.run(
            ["celery", "-A", "app.worker.celery_app", "status"],
            capture_output=True, text=True
        )
        if "OK" in result.stdout or result.returncode == 0:
            print("[OK] AI Worker is ONLINE and ready.")
        else:
            print("[OFFLINE] AI Worker is OFFLINE. (Run the celery worker command)")
    except Exception:
        print("[ERROR] Celery command failed. Is Celery installed?")

def check_frontend():
    print("\n[*] Checking Frontend (Next.js)...")
    frontend_path = "frontend/package.json"
    if os.path.exists(frontend_path):
        print("[OK] Frontend structure is INTACT.")
    else:
        print("[ERROR] Frontend folder not found.")

if __name__ == "__main__":
    print("--- CLIP AURA PRODUCTION SMOKE TEST ---\n")
    check_backend()
    check_database()
    check_celery()
    check_frontend()
    print("\n--- Test Complete ---")
