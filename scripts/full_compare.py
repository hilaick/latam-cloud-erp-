import requests, json
base = "http://localhost:9119"
r = requests.post(base+"/api/auth/login",json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
hdr = {"Authorization":"Bearer "+tk}

# 1. Get stored simulation
r2 = requests.get(base+"/api/projects/1787075729268", headers=hdr, timeout=30)
data = r2.json().get("project",{}).get("data",{})
sim = data.get("agenticDryRun",{})
ta = data.get("targetArchitecture",{})

print(f"Project: {data.get("name","?")} | Phase: {data.get("phase","?")} | Region: {data.get("region","?")}")
print(f"Master AK set: {bool(sim.get("summary",{}).get("iam_valid"))}")
print(f"Source region: {data.get("sourceRegion","?")}")
print(f"Stored sim trace entries: {len(sim.get("trace",[]))}")
print(f"Target arch has compute: {len(ta.get("compute",[]))} items")
print(f"Target arch migration: {ta.get("migration_summary",{})}")
print()

# 2. Run live and compare
r3 = requests.post(base+"/api/projects/1787075729268/simulate-orchestration",
    json={"mode":"live"}, headers=hdr, timeout=300)
live = r3.json()
inner = live.get("result", live)
lt = inner.get("trace",[])
ls = inner.get("summary",{})
lta = ls.get("target_architecture",{})

print(f"Live trace entries: {len(lt)}")
for e in lt:
    a = e.get("action","")
    p = e.get("phase","")
    m = e.get("message","")[:150]
    if "FAILED" in m:
        print(f"  FAIL {p}/{a}: {m}")
    else:
        print(f"  {p}/{a}: {m}")
    ld = e.get("live_data",{})
    if ld.get("source"):
        src = ld["source"]
        for s in src.get("servers",[]):
            print(f"    Server: {s.get("name","?")} | flavor: {s.get("flavor","?")} | status: {s.get("status","?")}")
    if "SMS" in a or "SYNC" in a:
        for k,v in ld.items():
            if isinstance(v, list):
                for item in v:
                    print(f"    {item.get("server","?")}: {item.get("status","?")}")
            else:
                print(f"    {k}: {v}")

print(f"\nLive source: {ls.get("discovery_results",{}).get("source_region","?")} -> {lta.get("migration_summary",{}).get("target_region","?")}")
print(f"Servers: {lta.get("migration_summary",{}).get("servers_to_migrate",0)} | Preflight: {ls.get("preflight_ok",False)}")
print(f"\nFull result saved to /tmp/live-result.json")
with open("/tmp/live-result.json","w") as f: f.write(r3.text)
