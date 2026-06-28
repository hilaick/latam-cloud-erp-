#!/usr/bin/env python3
"""
Console API access using browser cookies
Based on Network tab headers from Huawei Cloud Console
"""

import requests
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def call_console_api_with_cookies(cookies_dict, region="la-north-2", tenant_id=""):
    """
    Call the Console API using browser session cookies
    URL: https://{region}-console.huaweicloud.com/ecm/rest/cbc/rest/cbc/csborderadapterservice/v1/queryRiInstance
    """
    console_url = f"https://{region}-console.huaweicloud.com/ecm/rest/cbc/rest/cbc/csborderadapterservice/v1/queryRiInstance"
    
    payload = {
        "tenantId": tenant_id or "",
        "regionId": region,
        "cloudServiceType": "hws.service.type.ec2",
        "resourceType": "hws.resource.type.vm",
        "sortName": "validTime",
        "sortOrder": "desc",
        "curPage": 1,
        "pageSize": 100
    }
    
    # Headers from Network tab
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Content-Type": "application/json",
        "Host": f"{region}-console.huaweicloud.com",
        "Origin": f"https://{region}-console.huaweicloud.com",
        "Referer": f"https://{region}-console.huaweicloud.com/ecm/?region={region}",
        "Sec-Ch-Ua": '"Microsoft Edge";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
        "X-Language": "en-us",
        "X-Requested-With": "XMLHttpRequest",
        "X-Target-Services": "cbc-iam5",
        # Cookie headers from Network tab
        "agencyid": cookies_dict.get("agencyid", ""),
        "cftk": cookies_dict.get("cftk", ""),
        "projectname": region,
        "region": region,
    }
    
    # Add cookies to the session
    session = requests.Session()
    
    # Set the cookies from the cookie string
    if "cookie_string" in cookies_dict:
        # Parse cookie string
        cookie_items = cookies_dict["cookie_string"].split("; ")
        for item in cookie_items:
            if "=" in item:
                key, value = item.split("=", 1)
                session.cookies.set(key, value)
    
    # Also set individual cookie values
    for key, value in cookies_dict.items():
        if key not in ["cookie_string", "agencyid", "cftk", "projectname", "region"]:
            session.cookies.set(key, value)
    
    try:
        logger.info(f"Calling Console API: {console_url}")
        logger.info(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(console_url, json=payload, headers=headers, timeout=30)
        
        logger.info(f"Response status: HTTP {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            total_ris = data.get('page', {}).get('totalRecord', 0)
            logger.info(f"✓ Success! Found {total_ris} RIs")
            
            # Print first RI as sample
            ri_instances = data.get('riInstances', [])
            if ri_instances:
                logger.info(f"Sample RI: {json.dumps(ri_instances[0], indent=2)}")
            
            return data
        else:
            logger.error(f"✗ Console API failed: HTTP {response.status_code}")
            logger.error(f"Response: {response.text[:500]}")
            return None
            
    except Exception as e:
        logger.error(f"✗ Error calling Console API: {str(e)}")
        return None

def test_with_mock_cookies():
    """Test with mock cookies (replace with real ones from browser)"""
    print("Testing Console API with mock cookies...")
    print("=" * 60)
    
    # Mock cookies based on your Network tab
    # YOU NEED TO REPLACE THESE WITH ACTUAL COOKIES FROM YOUR BROWSER SESSION
    cookies = {
        "cookie_string": "ua=dd2da61cbb454c009813c4acaae61d31; flowCarddd2da61cbb454c009813c4acaae61d31=dd2da61cbb454c009813c4acaae61d31; _ga=GA1.2.210683267.1772632780; _frid=8a29162209444a20b93f4ddbdf830167; vk=debfec56-9d8b-42fb-b24a-f956ba5563a9; cbc-sid=204938483755399ea52dab7d70abfd71b88849bf81f979e6bd0d43954091e3182264907b5bdf3726369b; uba_countrycode=MX; flowCardundefined=undefined; HWWAFSESTIME=1780323323119; HWWAFSESID=402837919eb15aefc0; SessionID=64e6cf08-a503-4d41-8a11-e7d04bafa391; ad_sc=; ad_mdm=; ad_cmp=; ad_ctt=; ad_tm=; ad_adp=; ukey_sn=; domain_tag=dd2da61cbb454c009813c4acaae61d31; user_tag=6bfff7d0cea9495e9e81aae71407acb9; masked_domain=c*****acloud; masked_user=h****ivery; masked_phone=; usite=intl; popup_max_time=60; x-framework-ob=hec-hk; SID=Set2; agencyID=6bfff7d0cea9495e9e81aae71407acb9; third-party-access=''; browserCheckResult=A; cf=www.bing.com; HWS_INTL_ID=OxEo6ZmXv64FPT2OqTa9JA.._-_1780936979_-_eDmAHf_VvoG9EcyL-dpero17w3M.; csrf=8bb0e2ed-1fd7-477c-9625-9da2581be4ee; flowCardPopList=[{'ecm':'2026-06-01T14:16:46.360Z'},{'obs':'2026-06-01T14:30:55.166Z'},{'SMS':'2026-06-01T14:58:42.822Z'},{'cbr':'2026-06-01T20:31:50.101Z'},{'eps':'2026-06-01T21:35:36.281Z'},{'usercenter':'2026-06-08T15:23:34.038Z'},{'ecm':'2026-06-08T22:18:59.719Z'},{'ces':'2026-06-09T23:00:40.365Z'},{'cbr':'2026-06-15T16:07:00.544Z'},{'usercenter':'2026-06-15T16:59:28.987Z'}]; codelpacloud_hcdelivery_cfProjectName=la-north-2; cloud_verify_ticket=63555391-0f1e-4190-9dc3-34b0d040da07; commitDateObject={'ecm':'','obs':'','SMS':'','cbr':'','eps':'','iam':'','eip':'','nat':'','cts':'','costmanagement':'','usercenter':'','ServiceTickets':'','vpn':'','vpc':'','MgC':'','ces':'','ims':''}; npsFlowCardPopList=[{'ecm':'2026-06-24T16:32:08.708Z'},{'vpc':'2026-06-24T16:39:25.483Z'}]; J_SESSION_REGION=la-north-2; _fr_ssid=90573a941b4d412f9d0a4496c3f967a1; npsCommitDateObject={'ecm':'','vpc':'','vpn':'','MgC':'','SMS':''}; J_SESSION_ID=09227d072309dac50e194869a03355710d64d49f911feb1a; businessKey=6a841a17d552490d8a7d01f76a8fb0223a37e2feed1e4350; cftk=8H5Q-FEWU-O27O-1EFW-8XYH-V4RC-WW3H-IWE7; browserCheckResult=A; locale=en-us; cfLatestRecordTimestamp=1782506649341",
        "agencyid": "6bfff7d0cea9495e9e81aae71407acb9",
        "cftk": "8H5Q-FEWU-O27O-1EFW-8XYH-V4RC-WW3H-IWE7",
        "businessKey": "6a841a17d552490d8a7d01f76a8fb0223a37e2feed1e4350",
        "cloud_verify_ticket": "63555391-0f1e-4190-9dc3-34b0d040da07",
        # Individual important cookies
        "cbc-sid": "204938483755399ea52dab7d70abfd71b88849bf81f979e6bd0d43954091e3182264907b5bdf3726369b",
        "SessionID": "64e6cf08-a503-4d41-8a11-e7d04bafa391",
        "J_SESSION_ID": "09227d072309dac50e194869a03355710d64d49f911feb1a",
        "csrf": "8bb0e2ed-1fd7-477c-9625-9da2581be4ee",
    }
    
    # Test with mock cookies (will likely fail without real session)
    result = call_console_api_with_cookies(cookies, region="la-north-2")
    
    if result:
        print(f"\n✅ Console API access successful!")
        print(f"Found {result['page']['totalRecord']} Reserved Instances")
        
        # Save sample data
        with open('/tmp/console_api_cookie_response.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Response saved to /tmp/console_api_cookie_response.json")
    else:
        print("\n❌ Console API call failed (expected without valid session)")
        print("\nTo make this work, you need to:")
        print("1. Export cookies from your browser session")
        print("2. Update the cookies dictionary with real values")
        print("3. Run the script again")

if __name__ == "__main__":
    test_with_mock_cookies()
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("1. Export cookies from your browser (DevTools → Application → Cookies)")
    print("2. Update the cookies dictionary with real values")
    print("3. The script will work with valid session cookies")
    print("="*60)