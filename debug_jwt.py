import requests
import json

# Test the reconciliation endpoint directly
url = "http://localhost:9119/api/finops/ecs-ri-reconciliation"

# Try without auth first to see error
headers = {
    "Content-Type": "application/json"
}
data = {
    "projectId": "1782256193604"
}

print("Testing reconciliation endpoint without auth...")
try:
    response = requests.post(url, headers=headers, json=data, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50 + "\n")

# Now let me check what the actual error is by looking at Flask logs
print("Checking if Flask is running...")
import subprocess
result = subprocess.run(["ps", "aux"], capture_output=True, text=True)
flask_processes = [line for line in result.stdout.split('\n') if 'python3 app.py' in line]
print(f"Flask processes: {len(flask_processes)}")
for proc in flask_processes[:3]:
    print(f"  {proc[:100]}")

print("\n" + "="*50 + "\n")

# Let me also check the JWT config
print("Checking JWT config in app.py...")
with open("/home/huawei-cloud/latam-cloud-erp-/app.py", "r") as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "JWT_SECRET_KEY" in line:
            print(f"Line {i+1}: {line.strip()}")
        if "JWT_ACCESS_TOKEN_EXPIRES" in line:
            print(f"Line {i+1}: {line.strip()}")