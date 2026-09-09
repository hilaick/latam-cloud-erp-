import requests, json
r = requests.post("http://localhost:9119/api/auth/login",json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
r2 = requests.post("http://localhost:9119/api/projects/1787075729268/simulate-orchestration",
  json={"mode":"live"}, headers={"Authorization":"Bearer "+tk}, timeout=300)
with open("/tmp/live-result.json","w") as f: f.write(r2.text)
result = json.loads(r2.text)
inner = result.get("result", result)
trace = inner.get("trace",[])
print(f"Trace: {len(trace)} entries")
for e in trace:
    a = e.get("action","")
    p = e.get("phase","")
    m = e.get("message","")[:200]
    if "SMS" in a or "SYNC" in a or "GATEWAY" in a:
        print(f"  [{p}] {a}: {m}")
        ld = e.get("live_data",{})
        for r3 in ld.get("sms_results",ld.get("sync_results",[])):
            print(f"    {r3.get("server","?")}: {r3.get("status","?")} ip={r3.get("ip","?")}")
