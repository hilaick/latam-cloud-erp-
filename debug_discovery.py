#!/usr/bin/env python3
"""
Test script to trigger discovery and see what regions are being scanned
"""

import requests
import json
import time

def test_discovery():
    # This is a simplified test - in reality we need proper JWT auth
    # But we can at least see the logs when discovery is triggered from UI
    
    print("To see what's happening:")
    print("1. Open the web UI at http://localhost:9119")
    print("2. Login and go to ULEARNING project")
    print("3. Click 'Discover' button")
    print("4. Check Flask logs for:")
    print("   - 'Creating HuaweiDiscovery with region:'")
    print("   - 'HuaweiDiscovery initialized with regions:'")
    print("   - 'Discovery starting for regions:'")
    print("   - '⚠️ Found X resources, expected ~166' warning")
    print("   - Resource type breakdown")
    
    print("\nExpected issues to look for:")
    print("• Multiple regions in 'regions' list")
    print("• Region string with commas (e.g., 'af-south-1,la-south-2')")
    print("• High counts of specific resource types")
    
    return True

if __name__ == "__main__":
    test_discovery()