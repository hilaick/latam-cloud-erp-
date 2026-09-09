import requests, json
r = requests.post("http://localhost:9119/api/auth/login",
    json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
r2 = requests.post("http://localhost:9119/api/projects/1787075729268/simulate-orchestration",
  json={"mode":"live"}, headers={"Authorization":"Bearer "+tk}, timeout=300)
with open("/tmp/live-result.json","w") as f: f.write(r2.text)
result = json.loads(r2.text)
inner = result.get("result", result)
trace = inner.get("trace",[])
print("Trace entries: " + str(len(trace)))
sms_ok = False
for e in trace:
    a = e.get("action","")
    m = e.get("message","")[:300]
    p = e.get("phase","")
    if "SMS" in a:
        print("  ["+p+"] "+a+": "+m)
        for r3 in e.get("live_data",{}).get("sms_results",[]):
            s2 = r3.get("status","?")
            if "task_created" in s2 or "registered" in s2:
                sms_ok = True
            print("    "+str(r3.get("server","?"))+": "+s2+" ip="+str(r3.get("ip","?")))
    if "GATEWAY" in a:
        print("  ["+p+"] "+a+": "+m[:150])
if sms_ok:
    print("\nSUCCESS: SMS tasks created")
else:
    print("\nFAIL: SMS tasks not created")
