# Fix: Bypass Huawei Cloud SDK Region Validation with Dynamic Region Class

## Problem
The Huawei Cloud Python SDK's `SmsRegion` enum has a hardcoded list of regions that doesn't include newer LATAM endpoints (`la-north-2`, `la-south-2`, `sa-brazil-1`). When users select these regions, the SDK throws:
```
"region_id 'la-north-2' is not in the following supported regions of service 'Sms': [ap-southeast-3, cn-north-4, my-kualalumpur-1, ru-moscow-1]"
```

## Root Cause
The `SmsClient` class internally validates regions against a hardcoded list in the SDK, even before making API calls. This prevents LATAM users from accessing their SMS resources.

## Solution Attempted
Implemented dynamic region endpoint construction using the base `Region` class:

### Changes Made:
1. **Removed hardcoded `SmsRegion` import**
   ```python
   # BEFORE: from huaweicloudsdksms.v3.region.sms_region import SmsRegion
   # AFTER:  from huaweicloudsdkcore.region.region import Region
   ```

2. **Dynamic endpoint construction**
   ```python
   # BEFORE: .with_region(SmsRegion.value_of(region))
   # AFTER:  custom_region = Region(region, f"https://sms.{region}.myhuaweicloud.com")
   #         .with_region(custom_region)
   ```

3. **Removed Singapore region mapping** - Now uses exact user-selected region

### Code Changes:
```python
# BYPASS THE SDK'S HARDCODED REGION LIST
# Dynamically construct the native endpoint for the user's local region
custom_region = Region(region, f"https://sms.{region}.myhuaweicloud.com")

client = SmsClient.new_builder() \
    .with_credentials(credentials) \
    .with_region(custom_region) \
    .build()
```

## Current Status
**The fix is implemented correctly** but the Huawei Cloud SDK's `SmsClient` class **still validates regions internally** before allowing the API call. The SDK appears to have hardcoded validation that we cannot bypass through the public API.

## Testing Results
- ✅ **Syntax check passed** - Code compiles without errors
- ✅ **Dynamic region construction works** - `Region('la-north-2', 'https://sms.la-north-2.myhuaweicloud.com')` creates successfully
- ❌ **SDK still rejects region** - `SmsClient` validates against internal list before making API call

## Next Steps Required
Since the SDK blocks us at the client level, we need to:

### Option 1: HTTP-Level Bypass (Recommended)
Use `requests` library directly to call Huawei Cloud SMS API:
```python
import requests
from huaweicloudsdkcore.auth.credentials import BasicCredentials

# Generate signature manually or use SDK for auth only
credentials = BasicCredentials(ak, sk, project_id)
# Use credentials to sign requests
# Make direct HTTP calls to https://sms.{region}.myhuaweicloud.com
```

### Option 2: SDK Patch/Monkey Patch
Patch the SDK's region validation:
```python
import huaweicloudsdksms.v3.region.sms_region as sms_region
# Add LATAM regions to the SDK's internal list
sms_region._REGION_LIST['la-north-2'] = 'https://sms.la-north-2.myhuaweicloud.com'
```

### Option 3: Contact Huawei Cloud Support
Request SDK update to include LATAM SMS regions.

## Files Changed
- `app.py`: 8 insertions(+), 10 deletions(-)

## Impact
- **No functional change yet** - SDK still blocks LATAM regions
- **Foundation laid** - Dynamic endpoint construction ready
- **Ready for HTTP-level implementation** - Architecture supports bypass

## Recommendation
Proceed with **Option 1 (HTTP-Level Bypass)** in a follow-up PR. The current changes provide the necessary structure - we just need to replace the SDK client calls with direct HTTP requests using the authenticated credentials.

## Checklist
- [x] Removed `SmsRegion` import
- [x] Added `Region` import from core SDK
- [x] Implemented dynamic endpoint construction
- [x] Removed Singapore region mapping
- [x] Tested region object creation
- [ ] Implement HTTP-level bypass (next PR)
- [ ] Test with real Huawei Cloud credentials
- [ ] Update documentation for LATAM SMS support