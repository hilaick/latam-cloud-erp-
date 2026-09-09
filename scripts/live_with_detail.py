import requests, json
r = requests.post("http://localhost:9119/api/auth/login",
    json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
# Run live and grab source server detail
r2 = requests.post("http://localhost:9119/api/projects/1787075729268/simulate-orchestration",
    json={"mode":"live"},
    headers={"Authorization":"Bearer "+tk},
    timeout=300)
data = r2.json()
inner = data.get("result", data)
trace = inner.get("trace", [])
for e in trace:
    if e.get("action") == "LIVE_SOURCE_DISCOVERY":
        ld = e.get("live_data",{})
        print(f"live_data keys: {list(ld.keys())}")
        print(f"source: {json.dumps(ld.get("source",{}), indent=2)}")
    if e.get("action") == "LIVE_SMS_DEPLOY":
        ld = e.get("live_data",{})
        for r in ld.get("sms_results",[]):
            print(f"SMS: {r.get("server")} -> {r.get("status")}")
    # Also check target arch for server details
    if e.get("action") == "LIVE_BUILD_TARGET_ARCH":
        ta = e.get("live_data",{}).get("target_architecture",{})
        compute = ta.get("compute",[])
        for c in compute:
            print(f"Target arch: {c.get("source_name")} source_id={c.get("source_id","")[:20]} flavor={c.get("flavor")}")
