import requests, json
r = requests.post("http://localhost:9119/api/auth/login",json={"email":"admin@erp.com","password":"Admin2026!"})
tk = r.json()["access_token"]
# Get project data
r2 = requests.get("http://localhost:9119/api/projects/1787075729268", headers={"Authorization":"Bearer "+tk}, timeout=30)
adr = r2.json().get("project",{}).get("data",{}).get("agenticDryRun",{})
# Find source discovery live_data
for t in adr.get("trace",[]):
    if t.get("action") == "LIVE_SOURCE_DISCOVERY":
        ld = t.get("live_data",{})
        src = ld.get("source",{})
        print("Source discovery key structure:")
        for k in src:
            v = src[k]
            if isinstance(v, list) and len(v) > 0:
                print(f"  {k} (list of {len(v)}):")
                first = v[0]
                if isinstance(first, dict):
                    for fk in first:
                        fv = first[fk]
                        if isinstance(fv, (str, int, float, bool)):
                            print(f"    {fk}: {str(fv)[:100]}")
                        else:
                            print(f"    {fk}: ({type(fv).__name__}) {str(fv)[:100]}")
            else:
                print(f"  {k}: {str(v)[:100]}")
        print("\nRaw source payload:")
        print(json.dumps(src, indent=2)[:2000])
