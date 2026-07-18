#!/usr/bin/env python3
"""
Test script to debug IMS image attributes
"""

import sys
import os
sys.path.append('.')

# Mock the Huawei SDK to see what fields images have
class MockImage:
    def __init__(self):
        self.id = "test-id-123"
        self.name = "test-image"
        self.status = "active"
        self.min_disk = 40
        self.min_ram = 2048
        self.os_type = "Linux"
        # Common Huawei IMS fields
        self.__imagetype__ = "gold"  # gold=public, private=private
        self.is_public = False
        self.visibility = "private"
        self.image_type = "private"

def test_ims_fields():
    print("Testing IMS image field detection...")
    print("=" * 60)
    
    # Create mock image
    image = MockImage()
    
    # Check all attributes
    attrs = [attr for attr in dir(image) if not attr.startswith('_')]
    print("Available attributes:")
    for attr in attrs:
        try:
            val = getattr(image, attr)
            if not callable(val):
                print(f"  {attr}: {val} (type: {type(val).__name__})")
        except:
            print(f"  {attr}: <error>")
    
    print("\nCommon Huawei IMS fields:")
    print("  - __imagetype__: 'gold' = public, 'private' = private")
    print("  - is_public: True/False")
    print("  - visibility: 'public'/'private'")
    print("  - image_type: 'gold'/'private'")
    
    return True

if __name__ == "__main__":
    test_ims_fields()