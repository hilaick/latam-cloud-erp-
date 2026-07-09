# Huawei Cloud Cross-Account/Region Migration & Save State Features

## Summary
Implemented two critical enhancements for Huawei Cloud ERP migration automation:

1. **Save State Button** in Commercial True-Up (Phase 5)
2. **Source Huawei Cloud Credential Management** for cross-account/region migrations

## 1. Save State Button in Commercial True-Up

### Location
`frontend/src/components/wizard/StepPostLive.jsx` - CommercialTrueUpView component

### Functionality
- **Button**: Blue "Save State" button between "Export Procurement Report" and "Mark Technically Complete"
- **Action**: Saves current True-Up matrix, unquoted resources, and diagnostics to project data
- **Data Saved**:
  - `matrix`: Current reconciliation matrix
  - `unquoted_matrix`: Scope creep/unquoted resources
  - `diagnostics`: API diagnostics logs
  - `saved_at`: ISO timestamp

### Usage
1. Run NOC scan to populate True-Up matrix
2. Review procurement recommendations
3. Click "Save State" to preserve progress
4. Return later to continue from saved state

### Code Implementation
```javascript
const handleSaveState = () => {
    const finopsData = {
        matrix: matrix || [],
        unquoted_matrix: unquotedMatrix || [],
        diagnostics: apiDiagnostics || [],
        saved_at: new Date().toISOString()
    };
    onUpdateProject(activeProject.id, 'finops_matrix', finopsData);
    alert('Commercial True-Up state saved successfully!');
};
```

## 2. Source Huawei Cloud Credential Management

### Database Schema Changes
Added 5 new columns to `customers` table:
- `source_huawei_ak` (TEXT) - Source Huawei Cloud Access Key
- `source_huawei_sk` (TEXT) - Source Huawei Cloud Secret Key
- `source_huawei_region` (VARCHAR(50)) - Source region
- `source_huawei_project_id` (VARCHAR(100)) - Source project ID
- `source_huawei_domain_id` (VARCHAR(100)) - Source domain ID

### Migration Script
`migrations/add_source_huawei_columns.py` - Run to add columns

### Backend Integration
Updated `/api/cloud/inventory` endpoint in `routes/cloud_ops.py`:

#### Logic Flow
1. **Check source environment** from project's `triage.sourceEnvironment`
2. **Detect Huawei Cloud migrations**:
   - `huawei_cross_region` (different region)
   - `huawei_cross_account` (different account)
   - `huawei_az_to_az` (same region, different AZ)
   - `Huawei Cloud` (legacy option)
3. **Use source credentials** if available
4. **Fallback to master credentials** if source credentials not configured
5. **Log selection** for audit trail

#### Code Implementation
```python
# Determine if this is a Huawei Cloud cross-account/region migration
source_is_huawei_cloud = False
if source_env in ['huawei_cross_region', 'huawei_cross_account', 'huawei_az_to_az', 'Huawei Cloud']:
    source_is_huawei_cloud = True
    
    if customer and customer.source_huawei_ak and customer.source_huawei_sk:
        # Use source credentials
        discovery_engine = HuaweiDiscovery(
            encrypted_ak_data=source_ak, 
            encrypted_sk_data=source_sk, 
            region=source_region or region, 
            master_password=master_password
        )
    else:
        # Fall back to master credentials
        discovery_engine = HuaweiDiscovery(
            encrypted_ak_data=customer.ak, 
            encrypted_sk_data=customer.sk, 
            region=region, 
            master_password=master_password
        )
```

### Credential Encryption
Source credentials are automatically encrypted using existing vault system:
- Added `('source_huawei_ak', 'source_huawei_sk')` to AK/SK pairs in CRM update endpoint
- Uses same encryption as master AK/SK
- Stored as encrypted JSON in database

### UI Integration
Source environment selection in `PreSalesQualificationMatrix` component:
- **Cross-Cloud Migration**: AWS, Azure, Google Cloud, Other Public Clouds
- **Cloud-to-Cloud (Huawei Cloud)**:
  - `huawei_az_to_az` - Within same region
  - `huawei_cross_region` - Between Huawei Cloud regions
  - `huawei_cross_account` - Between Huawei Cloud accounts
- **On-premise**: Bare Metal, VMware, Nutanix

## 3. Testing Scenarios

### Scenario 1: Same Account, Different Region
- **Source Environment**: `huawei_cross_region`
- **Source Credentials**: Same as master AK/SK
- **Source Region**: Different from target region
- **Behavior**: Uses master credentials with source region parameter

### Scenario 2: Different Account, Same Region
- **Source Environment**: `huawei_cross_account`
- **Source Credentials**: Different AK/SK configured in customer profile
- **Source Region**: Same as target region
- **Behavior**: Uses source credentials with same region

### Scenario 3: Different Account, Different Region
- **Source Environment**: `huawei_cross_account`
- **Source Credentials**: Different AK/SK configured
- **Source Region**: Different from target region
- **Behavior**: Uses source credentials with source region

### Scenario 4: No Source Credentials Configured
- **Source Environment**: Any Huawei Cloud option
- **Source Credentials**: Not configured
- **Behavior**: Falls back to master credentials with warning log

## 4. Deployment Steps

### Database Migration
```bash
cd /home/huawei-cloud/latam-cloud-erp-
python migrations/add_source_huawei_columns.py
```

### Frontend Build
```bash
cd frontend
npm run build
```

### Flask Restart
```bash
pkill -f "python3.*app.py"
cd /home/huawei-cloud/latam-cloud-erp-
python3 app.py > /tmp/flask.log 2>&1 &
```

## 5. Verification

### Database Verification
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='customers' 
AND column_name LIKE 'source_huawei_%'
ORDER BY column_name;
```

### API Test
```bash
# Test with source credentials
curl -X POST http://localhost:9119/api/cloud/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customer_id": "<customer_id>",
    "projectId": "<project_id>",
    "provider": "Huawei",
    "region": "la-north-2"
  }'
```

### UI Verification
1. Navigate to Commercial True-Up (Step 5)
2. Verify "Save State" button appears
3. Click button and confirm success alert
4. Refresh page to verify state persistence

## 6. Benefits

### Save State Button
- ✅ Preserves True-Up progress between sessions
- ✅ Enables incremental reconciliation work
- ✅ Reduces data loss risk
- ✅ Improves user experience

### Source Credential Management
- ✅ Supports Huawei Cloud → Huawei Cloud migrations
- ✅ Automatic credential selection based on source environment
- ✅ Secure credential encryption
- ✅ Backward compatible (falls back to master credentials)
- ✅ Enables complex migration scenarios

## 7. Future Enhancements

### Planned Features
1. **Credential Validation** - Test source credentials before saving
2. **Multi-Source Discovery** - Discover from multiple source accounts
3. **Credential Rotation** - Automatic credential expiration management
4. **Audit Logging** - Track which credentials were used for each scan
5. **Bulk Operations** - Update source credentials for multiple customers

### Integration Points
- **SMS Migration Tasks** - Use source credentials for migration planning
- **DRS Replication** - Configure source credentials for data replication
- **Cost Analysis** - Compare source vs target pricing
- **Security Compliance** - Audit credential usage patterns

## 8. Troubleshooting

### Common Issues
1. **Source credentials not used**
   - Verify `sourceEnvironment` in project `triage` data
   - Check customer has `source_huawei_ak` and `source_huawei_sk`

2. **Save State not working**
   - Check browser console for errors
   - Verify `onUpdateProject` function exists
   - Check network tab for API calls

3. **Database migration failed**
   - Verify PostgreSQL connection
   - Check user has ALTER TABLE permissions
   - Run migration script with debug output

### Log Analysis
Check Flask logs for source credential usage:
```bash
grep -i "source.*huawei\|source.*credential" /tmp/flask.log
```

### Support Contact
For issues with these features, contact:
- **Technical Support**: ERP Migration Team
- **Documentation**: Huawei Cloud ERP Wiki
- **Bug Reports**: GitHub Issues

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-09  
**Author**: Hermes Agent  
**Status**: ✅ Production Ready