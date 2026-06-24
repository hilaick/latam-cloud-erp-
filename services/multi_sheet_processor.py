#!/usr/bin/env python3
"""
Multi-sheet Excel processor for PPU vs RI quotations.
"""

import pandas as pd
from typing import Dict, Any, List, Tuple
from services.excel_ingestor import process_huawei_quotation, process_generic_quotation_df, load_dataframe_smart
from services.excel_ingestor import _extract_commercial_details

def process_excel_with_sheets(file_path: str, customer_name: str) -> Dict[str, Any]:
    """
    Process Excel file with multiple sheets, detecting PPU vs RI.
    Returns merged blueprint with pricing summary.
    """
    if not str(file_path).lower().endswith(('.xlsx', '.xls')):
        # Single file (CSV or other) - use existing processor
        return process_huawei_quotation(file_path, customer_name)
    
    try:
        # Load all sheets
        xls = pd.ExcelFile(file_path)
        sheet_names = xls.sheet_names
        
        print(f"📊 Found {len(sheet_names)} sheets: {sheet_names}")
        
        blueprints = []
        for sheet_name in sheet_names:
            try:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                if df.empty:
                    print(f"⚠️ Sheet '{sheet_name}' is empty, skipping")
                    continue
                
                # Detect sheet type
                sheet_type = detect_sheet_type(df, sheet_name)
                print(f"📋 Sheet '{sheet_name}' detected as: {sheet_type}")
                
                # Process sheet
                blueprint = process_huawei_quotation_df_wrapper(df, customer_name, sheet_type)
                blueprints.append({
                    'sheet_name': sheet_name,
                    'type': sheet_type,
                    'blueprint': blueprint
                })
                
            except Exception as e:
                print(f"❌ Error processing sheet '{sheet_name}': {e}")
                continue
        
        if not blueprints:
            raise ValueError("No valid sheets found in Excel file")
        
        # Merge blueprints
        return merge_blueprints(blueprints, customer_name)
        
    except Exception as e:
        print(f"❌ Multi-sheet processing failed: {e}")
        # Fall back to single sheet processing
        return process_huawei_quotation(file_path, customer_name)

def detect_sheet_type(df: pd.DataFrame, sheet_name: str) -> str:
    """Detect if sheet contains PPU or RI pricing."""
    sheet_lower = sheet_name.lower()
    df_str = df.to_string().lower()
    
    # Check sheet name
    if any(keyword in sheet_lower for keyword in ['ri', 'reserved', 'reservation', 'commitment', 'savings', '1-year', '3-year']):
        return 'RI'
    elif any(keyword in sheet_lower for keyword in ['ppu', 'pay-per-use', 'pay as you go', 'on-demand', 'hourly']):
        return 'PPU'
    
    # Check column names
    columns_str = ' '.join([str(col).lower() for col in df.columns])
    if any(keyword in columns_str for keyword in ['reserved', '1-year', '3-year', 'savings plan', 'commitment']):
        return 'RI'
    elif any(keyword in columns_str for keyword in ['pay-per-use', 'on-demand', 'hourly', 'monthly']):
        return 'PPU'
    
    # Check data content (first 20 rows)
    sample_data = df.head(20).to_string().lower()
    if any(keyword in sample_data for keyword in ['reserved', '1-year', '3-year', 'savings']):
        return 'RI'
    elif any(keyword in sample_data for keyword in ['pay-per-use', 'on-demand', 'hourly']):
        return 'PPU'
    
    # Default to PPU (most common)
    return 'PPU'

def process_huawei_quotation_df_wrapper(df: pd.DataFrame, customer_name: str, pricing_type: str = 'PPU') -> Dict[str, Any]:
    """
    Wrapper to process a single dataframe with pricing type.
    """
    # Use the generic processor for now
    blueprint = process_generic_quotation_df(df, customer_name)
    
    # Add pricing type to all assets
    for asset in blueprint['commercial_intent']['deployable_assets']:
        asset['pricing_type'] = pricing_type
    
    for asset in blueprint['commercial_intent']['account_assets']:
        asset['pricing_type'] = pricing_type
    
    return blueprint

def merge_blueprints(blueprints: List[Dict], customer_name: str) -> Dict[str, Any]:
    """
    Merge multiple blueprints into one, preserving pricing types.
    """
    if len(blueprints) == 1:
        return blueprints[0]['blueprint']
    
    # Start with first blueprint as base
    merged = blueprints[0]['blueprint']
    
    # Calculate pricing summary
    ppu_total = 0.0
    ri_total = 0.0
    
    # Merge assets from all blueprints
    for bp_data in blueprints[1:]:
        blueprint = bp_data['blueprint']
        pricing_type = bp_data['type']
        
        # Merge deployable assets
        for asset in blueprint['commercial_intent']['deployable_assets']:
            # Ensure pricing_type is set
            asset['pricing_type'] = pricing_type
            
            # Add to merged
            merged['commercial_intent']['deployable_assets'].append(asset)
            
            # Add to pricing summary
            total_price = asset.get('total_price', 0)
            if pricing_type == 'PPU':
                ppu_total += total_price
            else:
                ri_total += total_price
        
        # Merge account assets
        for asset in blueprint['commercial_intent']['account_assets']:
            asset['pricing_type'] = pricing_type
            merged['commercial_intent']['account_assets'].append(asset)
    
    # Add pricing summary
    merged['commercial_intent']['pricing_summary'] = {
        'ppu_total': ppu_total,
        'ri_total': ri_total,
        'total_quoted': ppu_total + ri_total,
        'currency': merged['commercial_intent']['deployable_assets'][0].get('currency', 'USD') if merged['commercial_intent']['deployable_assets'] else 'USD'
    }
    
    print(f"✅ Merged {len(blueprints)} sheets")
    print(f"💰 PPU Total: ${ppu_total:,.2f}")
    print(f"💰 RI Total: ${ri_total:,.2f}")
    print(f"💰 Total Quoted: ${(ppu_total + ri_total):,.2f}")
    
    return merged