import requests, json
r = requests.post("http://localhost:9119/api/auth/login",json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
r2 = requests.post("http://localhost:9119/api/projects/1787075729268/simulate-orchestration",
  json={"mode":"live"},
  headers={"Authorization":"Bearer "+tk},
  timeout=300)
with open("/tmp/live-result.json","w") as f: f.write(r2.text)
result = json.loads(r2.text)
inner = result.get("result", result)
trace = inner.get("trace",[])
print(f"Trace entries: {len(trace)}")
for e in trace:
    a = e.get("action","")
    m = e.get("message","")[:150]
    p = e.get("phase","")
    if "FAILED" in m:
        print(f"  FAIL [{p}] {a}: {m}")
    elif "GATEWAY" in a or "SMS" in a or "SYNC" in a:
        print(f"  [{p}] {a}: {m}")
    else:
        print(f"  OK  [{p}] {a}")
