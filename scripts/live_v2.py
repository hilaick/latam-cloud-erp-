import requests, json
r = requests.post("http://localhost:9119/api/auth/login",
    json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
r2 = requests.post("http://localhost:9119/api/projects/1787075729268/simulate-orchestration",
  json={"mode":"live"}, headers={"Authorization":"Bearer "+tk}, timeout=300)
with open("/tmp/live-result.json","w") as f: f.write(r2.text)
result = json.loads(r2.text)
inner = result.get("result", result)
for e in inner.get("trace",[]):
    if e.get("action") == "LIVE_SOURCE_DISCOVERY":
        ld = e.get("live_data",{})
        print("Source server details:")
        for sid, srv in ld.get("source_servers_detail",{}).items():
            print(f"  {srv.get("name")}: ip={srv.get("ip")} flavor={srv.get("flavor")} vcpus={srv.get("vcpus")} ram={srv.get("ram")}")
        print("\nEIPs in source:")
        for e in ld.get("source_eips",[]):
            print(f"  {e.get("ip")} -> port_id={e.get("port_id","")[:20]} status={e.get("status")}")
    if "SMS" in e.get("action",""):
        print(f"\nSMS: {e.get("message","")[:300]}")
        for sr in e.get("live_data",{}).get("sms_results",[]):
            print(f"  {sr.get("server")}: {sr.get("status")} ip={sr.get("ip")}")
