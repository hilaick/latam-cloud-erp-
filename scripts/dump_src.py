import requests, json
r = requests.post("http://localhost:9119/api/auth/login",json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
r2 = requests.get("http://localhost:9119/api/projects/1787075729268",headers={"Authorization":"Bearer "+tk},timeout=30)
adr = r2.json().get("project",{}).get("data",{}).get("agenticDryRun",{})
# Find source discovery
for t in adr.get("trace",[]):
    if t.get("action") in ("LIVE_SOURCE_DISCOVERY","LIVE_ECS_DISCOVERY"):
        ld = t.get("live_data",{})
        print(f"=== {t.get("action")} ===\n{json.dumps(ld,indent=2)[:3000]}\n")
