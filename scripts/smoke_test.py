import requests
import sys
import time

BASE_URL = "http://localhost:8000"

def test_api_health():
    print("🔍 Testing API Health...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ API is UP")
            return True
        else:
            print(f"❌ API returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Connection Failed: {e}")
        return False

def test_docs_page():
    print("🔍 Testing Docs Page...")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✅ Documentation is accessible")
            return True
        else:
            print(f"❌ Docs returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Docs Connection Failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Clip Aura Smoke Test...")
    results = [
        test_api_health(),
        test_docs_page()
    ]
    
    if all(results):
        print("\n✨ ALL SYSTEMS GO!")
        sys.exit(0)
    else:
        print("\n⚠️ SOME SYSTEMS FAILED!")
        sys.exit(1)
