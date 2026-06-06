import requests
import json

# Test health check
print("Testing /health...")
try:
    r = requests.get("http://127.0.0.1:8000/health")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Error: {e}")

print("\nTesting /high-risk-accounts...")
try:
    r = requests.get("http://127.0.0.1:8000/high-risk-accounts")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
    # Try to parse JSON
    data = r.json()
    print(f"Parsed JSON: {json.dumps(data, indent=2)}")
except Exception as e:
    print(f"Error: {e}")

print("\nTesting /model/feature-importance...")
try:
    r = requests.get("http://127.0.0.1:8000/model/feature-importance")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
    # Try to parse JSON
    data = r.json()
    print(f"Parsed JSON: {json.dumps(data, indent=2)}")
except Exception as e:
    print(f"Error: {e}")
