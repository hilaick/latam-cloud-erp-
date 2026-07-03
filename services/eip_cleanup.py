#!/usr/bin/env python3
"""
EIP Cleanup Script for Phase 4.7 Teardown & Garbage Collection
Identifies and optionally releases unbound EIPs to prevent cost leakage.
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkeip.v2 import EipClient, ListPublicipsRequest, DeletePublicipRequest
from huaweicloudsdkcore.region.region import Region
from huaweicloudsdkcore.exceptions import exceptions

class EIPCleanupManager:
    """Manage EIP cleanup operations for Huawei Cloud"""
    
    def __init__(self, ak: str, sk: str, project_id: str, region: str = 'la-north-2'):
        """
        Initialize EIP cleanup manager
        
        Args:
            ak: Huawei Cloud Access Key
            sk: Huawei Cloud Secret Key
            project_id: Project ID
            region: Region (default: la-north-2)
        """
        self.ak = ak
        self.sk = sk
        self.project_id = project_id
        self.region = region
        self.credentials = BasicCredentials(ak, sk, project_id)
        
    def get_all_eips(self) -> List[Dict[str, Any]]:
        """Get all EIPs in the region"""
        try:
            eip_region = Region(id=self.region, endpoint=f"https://vpc.{self.region}.myhuaweicloud.com")
            eip_client = EipClient.new_builder() \
                .with_credentials(self.credentials) \
                .with_region(eip_region) \
                .build()
            
            request = ListPublicipsRequest(limit=100)
            response = eip_client.list_publicips(request)
            
            eips = []
            for eip in response.publicips or []:
                eip_info = {
                    'id': eip.id,
                    'public_ip_address': eip.public_ip_address,
                    'alias': getattr(eip, 'alias', eip.public_ip_address),
                    'status': getattr(eip, 'status', 'Unknown'),
                    'type': getattr(eip, 'type', 'Unknown'),
                    'bandwidth_size': getattr(eip, 'bandwidth_size', 0),
                    'bandwidth_name': getattr(eip, 'bandwidth_name', 'Unknown'),
                    'port_id': getattr(eip, 'port_id', None),
                    'is_bound': bool(getattr(eip, 'port_id', None)),
                    'created_at': getattr(eip, 'create_time', 'Unknown'),
                    'enterprise_project_id': getattr(eip, 'enterprise_project_id', 'N/A')
                }
                eips.append(eip_info)
            
            return eips
            
        except exceptions.ClientRequestException as e:
            print(f"Error listing EIPs: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error: {e}")
            return []
    
    def analyze_eips(self, eips: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze EIPs and identify unbound ones"""
        total_eips = len(eips)
        bound_eips = [e for e in eips if e['is_bound']]
        unbound_eips = [e for e in eips if not e['is_bound']]
        
        # Calculate cost impact
        total_unbound_bandwidth = sum(e['bandwidth_size'] for e in unbound_eips)
        estimated_monthly_cost = total_unbound_bandwidth * 0.1  # $0.10 per Mbps/month
        
        # Categorize by risk level
        high_risk = [e for e in unbound_eips if e['bandwidth_size'] >= 100]
        medium_risk = [e for e in unbound_eips if 50 <= e['bandwidth_size'] < 100]
        low_risk = [e for e in unbound_eips if 0 < e['bandwidth_size'] < 50]
        
        return {
            'total_eips': total_eips,
            'bound_eips': len(bound_eips),
            'unbound_eips': len(unbound_eips),
            'total_unbound_bandwidth': total_unbound_bandwidth,
            'estimated_monthly_cost': round(estimated_monthly_cost, 2),
            'risk_breakdown': {
                'high': len(high_risk),
                'medium': len(medium_risk),
                'low': len(low_risk)
            },
            'unbound_eips_details': unbound_eips,
            'bound_eips_details': bound_eips
        }
    
    def release_eip(self, eip_id: str, eip_address: str) -> bool:
        """Release a single EIP"""
        try:
            eip_region = Region(id=self.region, endpoint=f"https://vpc.{self.region}.myhuaweicloud.com")
            eip_client = EipClient.new_builder() \
                .with_credentials(self.credentials) \
                .with_region(eip_region) \
                .build()
            
            request = DeletePublicipRequest(publicip_id=eip_id)
            response = eip_client.delete_publicip(request)
            
            print(f"✅ Released EIP {eip_address} ({eip_id})")
            return True
            
        except exceptions.ClientRequestException as e:
            print(f"❌ Failed to release EIP {eip_address}: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error releasing EIP {eip_address}: {e}")
            return False
    
    def release_multiple_eips(self, eip_ids: List[str], eip_addresses: List[str], dry_run: bool = True) -> Dict[str, Any]:
        """Release multiple EIPs with confirmation"""
        results = {
            'success': [],
            'failed': [],
            'skipped': [],
            'total_released': 0,
            'total_bandwidth_freed': 0
        }
        
        for eip_id, eip_address in zip(eip_ids, eip_addresses):
            # Get EIP details for bandwidth calculation
            eip_info = None
            all_eips = self.get_all_eips()
            for eip in all_eips:
                if eip['id'] == eip_id:
                    eip_info = eip
                    break
            
            if dry_run:
                bandwidth = eip_info['bandwidth_size'] if eip_info else 0
                print(f"📋 [DRY RUN] Would release EIP {eip_address} ({eip_id}) - {bandwidth} Mbps")
                results['skipped'].append({
                    'id': eip_id,
                    'address': eip_address,
                    'bandwidth': bandwidth
                })
                results['total_bandwidth_freed'] += bandwidth
            else:
                success = self.release_eip(eip_id, eip_address)
                if success:
                    bandwidth = eip_info['bandwidth_size'] if eip_info else 0
                    results['success'].append({
                        'id': eip_id,
                        'address': eip_address,
                        'bandwidth': bandwidth
                    })
                    results['total_released'] += 1
                    results['total_bandwidth_freed'] += bandwidth
                else:
                    results['failed'].append({
                        'id': eip_id,
                        'address': eip_address
                    })
        
        return results
    
    def generate_cleanup_report(self, analysis: Dict[str, Any]) -> str:
        """Generate a cleanup report"""
        report = []
        report.append("=" * 80)
        report.append("EIP CLEANUP REPORT - PHASE 4.7 TEARDOWN & GARBAGE COLLECTION")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Region: {self.region}")
        report.append(f"Project ID: {self.project_id}")
        report.append("")
        report.append("📊 SUMMARY")
        report.append("-" * 40)
        report.append(f"Total EIPs: {analysis['total_eips']}")
        report.append(f"Bound EIPs: {analysis['bound_eips']}")
        report.append(f"Unbound EIPs: {analysis['unbound_eips']}")
        report.append(f"Total Unbound Bandwidth: {analysis['total_unbound_bandwidth']} Mbps")
        report.append(f"Estimated Monthly Cost: ${analysis['estimated_monthly_cost']}")
        report.append("")
        report.append("⚠️  RISK BREAKDOWN")
        report.append("-" * 40)
        report.append(f"High Risk (≥100 Mbps): {analysis['risk_breakdown']['high']}")
        report.append(f"Medium Risk (50-99 Mbps): {analysis['risk_breakdown']['medium']}")
        report.append(f"Low Risk (1-49 Mbps): {analysis['risk_breakdown']['low']}")
        report.append("")
        
        if analysis['unbound_eips_details']:
            report.append("🔴 UNBOUND EIPs (COST LEAKAGE)")
            report.append("-" * 40)
            for i, eip in enumerate(analysis['unbound_eips_details'], 1):
                risk = "HIGH" if eip['bandwidth_size'] >= 100 else "MEDIUM" if eip['bandwidth_size'] >= 50 else "LOW"
                monthly_cost = eip['bandwidth_size'] * 0.1
                report.append(f"{i}. {eip['public_ip_address']} ({eip['alias']})")
                report.append(f"   ID: {eip['id']}")
                report.append(f"   Bandwidth: {eip['bandwidth_size']} Mbps ({eip['bandwidth_name']})")
                report.append(f"   Status: {eip['status']}")
                report.append(f"   Created: {eip['created_at']}")
                report.append(f"   Monthly Cost: ${monthly_cost:.2f}")
                report.append(f"   Risk Level: {risk}")
                report.append("")
        
        if analysis['bound_eips_details']:
            report.append("✅ BOUND EIPs (IN USE)")
            report.append("-" * 40)
            for i, eip in enumerate(analysis['bound_eips_details'][:10], 1):  # Show first 10
                report.append(f"{i}. {eip['public_ip_address']} ({eip['alias']}) - Bound")
                if i == 10 and len(analysis['bound_eips_details']) > 10:
                    report.append(f"   ... and {len(analysis['bound_eips_details']) - 10} more bound EIPs")
                    break
        
        report.append("")
        report.append("🚀 RECOMMENDED ACTIONS")
        report.append("-" * 40)
        report.append("1. REVIEW each unbound EIP - Is it needed for future use?")
        report.append("2. RELEASE unnecessary EIPs - Use cleanup script with --execute flag")
        report.append("3. ATTACH needed EIPs - Bind to ECS/ELB/NAT resources")
        report.append("4. REDUCE bandwidth - Adjust to minimum required")
        report.append("5. IMPLEMENT monitoring - Set up alerts for unbound EIPs")
        report.append("")
        report.append("🔧 CLEANUP COMMANDS")
        report.append("-" * 40)
        report.append("# Dry run (safe - shows what would be deleted)")
        report.append(f"python3 services/eip_cleanup.py --ak YOUR_AK --sk YOUR_SK --project {self.project_id} --region {self.region} --dry-run")
        report.append("")
        report.append("# Execute cleanup (releases all unbound EIPs)")
        report.append(f"python3 services/eip_cleanup.py --ak YOUR_AK --sk YOUR_SK --project {self.project_id} --region {self.region} --execute")
        report.append("")
        report.append("# Selective cleanup (release specific EIPs)")
        report.append(f"python3 services/eip_cleanup.py --ak YOUR_AK --sk YOUR_SK --project {self.project_id} --region {self.region} --eips EIP_ID1,EIP_ID2")
        report.append("=" * 80)
        
        return "\n".join(report)


def main():
    parser = argparse.ArgumentParser(description='Huawei Cloud EIP Cleanup Tool')
    parser.add_argument('--ak', required=True, help='Huawei Cloud Access Key')
    parser.add_argument('--sk', required=True, help='Huawei Cloud Secret Key')
    parser.add_argument('--project', required=True, help='Project ID')
    parser.add_argument('--region', default='la-north-2', help='Region (default: la-north-2)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without actually deleting')
    parser.add_argument('--execute', action='store_true', help='Execute cleanup (releases unbound EIPs)')
    parser.add_argument('--eips', help='Comma-separated list of specific EIP IDs to release')
    parser.add_argument('--output', help='Output file for report (default: print to console)')
    
    args = parser.parse_args()
    
    # Initialize cleanup manager
    manager = EIPCleanupManager(args.ak, args.sk, args.project, args.region)
    
    # Get all EIPs
    print("🔍 Scanning for EIPs...")
    all_eips = manager.get_all_eips()
    
    if not all_eips:
        print("No EIPs found in the specified region/project.")
        return
    
    # Analyze EIPs
    analysis = manager.analyze_eips(all_eips)
    
    # Generate and display report
    report = manager.generate_cleanup_report(analysis)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"📄 Report saved to: {args.output}")
    else:
        print(report)
    
    # Handle cleanup actions
    if args.eips:
        # Release specific EIPs
        eip_ids = [eid.strip() for eid in args.eips.split(',')]
        eip_addresses = []
        
        # Get addresses for the specified IDs
        for eip_id in eip_ids:
            eip_info = next((e for e in all_eips if e['id'] == eip_id), None)
            if eip_info:
                eip_addresses.append(eip_info['public_ip_address'])
            else:
                print(f"⚠️  EIP ID {eip_id} not found")
                eip_addresses.append(f"Unknown ({eip_id})")
        
        if eip_addresses:
            print(f"\n🎯 Releasing {len(eip_ids)} specified EIPs...")
            results = manager.release_multiple_eips(eip_ids, eip_addresses, dry_run=args.dry_run)
            
            if args.dry_run:
                print(f"\n📋 DRY RUN COMPLETE: Would release {len(results['skipped'])} EIPs")
                print(f"   Total bandwidth to free: {results['total_bandwidth_freed']} Mbps")
            else:
                print(f"\n✅ CLEANUP COMPLETE:")
                print(f"   Successfully released: {len(results['success'])} EIPs")
                print(f"   Failed to release: {len(results['failed'])} EIPs")
                print(f"   Total bandwidth freed: {results['total_bandwidth_freed']} Mbps")
    
    elif args.execute and not args.dry_run:
        # Release all unbound EIPs
        unbound_eips = analysis['unbound_eips_details']
        if unbound_eips:
            print(f"\n🚨 EXECUTING CLEANUP: Releasing {len(unbound_eips)} unbound EIPs...")
            print("This action cannot be undone!")
            
            # Ask for confirmation
            confirm = input(f"\nAre you sure you want to release {len(unbound_eips)} unbound EIPs? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Cleanup cancelled.")
                return
            
            eip_ids = [e['id'] for e in unbound_eips]
            eip_addresses = [e['public_ip_address'] for e in unbound_eips]
            
            results = manager.release_multiple_eips(eip_ids, eip_addresses, dry_run=False)
            
            print(f"\n✅ CLEANUP COMPLETE:")
            print(f"   Successfully released: {len(results['success'])} EIPs")
            print(f"   Failed to release: {len(results['failed'])} EIPs")
            print(f"   Total bandwidth freed: {results['total_bandwidth_freed']} Mbps")
            print(f"   Estimated monthly savings: ${results['total_bandwidth_freed'] * 0.1:.2f}")
        else:
            print("\n✅ No unbound EIPs to clean up!")
    
    elif args.dry_run and analysis['unbound_eips'] > 0:
        print(f"\n📋 DRY RUN: Found {analysis['unbound_eips']} unbound EIPs")
        print(f"   Total bandwidth: {analysis['total_unbound_bandwidth']} Mbps")
        print(f"   Estimated monthly cost: ${analysis['estimated_monthly_cost']}")
        print("\nTo execute cleanup, run with --execute flag")


if __name__ == "__main__":
    main()