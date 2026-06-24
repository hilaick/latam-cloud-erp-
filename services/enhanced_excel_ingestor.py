#!/usr/bin/env python3
"""
Enhanced Excel/CSV Quotation Normalization Engine
Handles PPU vs RI sheets, captures quantity and pricing, and merges data intelligently.
"""

import pandas as pd
import re
import csv
from io import StringIO
from typing import Optional, Dict, Any, List, Tuple
from services.semantic_classifier import classify_unknown_service_with_ai
from services.excel_ingestor import load_dataframe_smart, process_huawei_quotation, process_generic_quotation_df

def load_all_excel_sheets(file_path: str) -> Dict[str, pd.DataFrame]:
    """Load all sheets from Excel file, detecting PPU vs RI."""
    if not str(file_path).lower().endswith(('.xlsx', '.xls')):
        return {'main': load_dataframe_smart(file_path)}
    
    try:
        xls = pd.ExcelFile(file_path)
        sheets = {}
        
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Clean the dataframe
            df = clean_dataframe(df)
            
            # Detect sheet type
            sheet_type = detect_sheet_type(df, sheet_name)
            sheets[sheet_name] = {
                'dataframe': df,
                'type': sheet_type,
                'name': sheet_name
            }
        
        return sheets
    except Exception as e:
        print(f"⚠️ Excel multi-sheet parse failed: {e}")
        # Fall back to single sheet
        return {'main': load_dataframe_smart(file_path)}

def detect_sheet_type(df: pd.DataFrame, sheet_name: str) -> str:
    """Detect if sheet contains PPU or RI pricing."""
    sheet_lower = sheet_name.lower()
    df_str = df.to_string().lower()
    
    # Check sheet name
    if any(keyword in sheet_lower for keyword in ['ri', 'reserved', 'reservation', 'commitment', 'savings']):
        return 'RI'
    elif any(keyword in sheet_lower for keyword in ['ppu', 'pay-per-use', 'pay as you go', 'on-demand']):
        return 'PPU'
    
    # Check column names
    columns_str = ' '.join([str(col).lower() for col in df.columns])
    if any(keyword in columns_str for keyword in ['reserved', '1-year', '3-year', 'savings plan', 'commitment']):
        return 'RI'
    elif any(keyword in columns_str for keyword in ['pay-per-use', 'on-demand', 'hourly', 'monthly']):
        return 'PPU'
    
    # Check data content
    sample_data = df.head(20).to_string().lower()
    if any(keyword in sample_data for keyword in ['reserved', '1-year', '3-year', 'savings']):
        return 'RI'
    elif any(keyword in sample_data for keyword in ['pay-per-use', 'on-demand', 'hourly']):
        return 'PPU'
    
    # Default to PPU (most common)
    return 'PPU'

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Clean dataframe by removing empty rows and columns."""
    # Remove completely empty rows
    df = df.dropna(how='all')
    
    # Remove completely empty columns
    df = df.dropna(axis=1, how='all')
    
    # Reset index
    df = df.reset_index(drop=True)
    
    # Convert all column names to string and strip whitespace
    df.columns = [str(col).strip() for col in df.columns]
    
    return df

def extract_commercial_details(row: pd.Series) -> Dict[str, Any]:
    """Extract comprehensive commercial intent from Excel row."""
    details = {
        "billing_mode": "Pay-per-use",
        "term": None,
        "quantity": 1,
        "unit_price": 0.0,
        "total_price": 0.0,
        "currency": "USD",
        "pricing_type": "PPU"  # PPU or RI
    }
    
    # Extract billing mode and term
    for col in ['billing mode', 'pricing mode', 'term', 'charge mode', 'billing', 'payment option']:
        if col in row and pd.notna(row[col]):
            val = str(row[col]).strip().lower()
            if 'year' in val or 'annual' in val or 'reserved' in val:
                details["billing_mode"] = "Yearly"
                details["pricing_type"] = "RI"
                if '1' in val:
                    details["term"] = "1-year"
                elif '3' in val:
                    details["term"] = "3-year"
                else:
                    details["term"] = "yearly"
            elif 'month' in val:
                details["billing_mode"] = "Monthly"
                details["pricing_type"] = "RI"
                details["term"] = "monthly"
            elif any(keyword in val for keyword in ['pay-per-use', 'on-demand', 'hourly', 'ppu']):
                details["billing_mode"] = "Pay-per-use"
                details["pricing_type"] = "PPU"
                details["term"] = "hourly"
    
    # Extract quantity
    for col in ['quantity', 'qty', 'count', 'instances', 'units']:
        if col in row and pd.notna(row[col]):
            try:
                details["quantity"] = int(float(str(row[col])))
            except:
                pass
    
    # Extract unit price
    for col in ['unit price', 'price per unit', 'unit cost', 'rate', 'hourly rate', 'monthly rate']:
        if col in row and pd.notna(row[col]):
            try:
                # Remove currency symbols and commas
                price_str = str(row[col]).replace('$', '').replace(',', '').replace('USD', '').strip()
                details["unit_price"] = float(price_str)
            except:
                pass
    
    # Extract total price
    for col in ['total price', 'amount', 'purchase amount', 'total cost', 'extended price']:
        if col in row and pd.notna(row[col]):
            try:
                price_str = str(row[col]).replace('$', '').replace(',', '').replace('USD', '').strip()
                details["total_price"] = float(price_str)
            except:
                pass
    
    # Extract currency
    for col in ['currency', 'curr']:
        if col in row and pd.notna(row[col]):
            curr = str(row[col]).strip().upper()
            if curr in ['USD', 'EUR', 'GBP', 'JPY', 'CNY']:
                details["currency"] = curr
    
    # If total_price is 0 but we have unit_price and quantity, calculate it
    if details["total_price"] == 0 and details["unit_price"] > 0 and details["quantity"] > 0:
        details["total_price"] = details["unit_price"] * details["quantity"]
    
    return details

def process_multi_sheet_quotation(file_path: str, customer_name: str) -> Dict[str, Any]:
    """
    Process Excel files with multiple sheets (PPU and RI).
    Merges data from all sheets into a single commercial intent.
    """
    sheets = load_all_excel_sheets(file_path)
    
    blueprint = {
        "customer": customer_name,
        "delivery_scope": "landing_zone_only",
        "governance": { "requires_hypercare": False, "maintenance_windows": [] },
        "topology": { "network": [], "compute": [], "databases": [], "storage": [], "security": [] },
        "commercial_intent": { 
            "deployable_assets": [],
            "account_assets": [],
            "pricing_summary": {
                "ppu_total": 0.0,
                "ri_total": 0.0,
                "total_quoted": 0.0,
                "currency": "USD"
            }
        }
    }
    
    # Process each sheet
    for sheet_name, sheet_data in sheets.items():
        df = sheet_data['dataframe']
        sheet_type = sheet_data['type']
        
        print(f"📊 Processing sheet '{sheet_name}' as {sheet_type}")
        
        # Process the dataframe
        sheet_blueprint = process_huawei_quotation_df(df, customer_name, sheet_type)
        
        # Merge deployable assets
        for asset in sheet_blueprint['commercial_intent']['deployable_assets']:
            # Add pricing type to asset
            asset['pricing_type'] = sheet_type
            
            # Update pricing summary
            if sheet_type == 'PPU':
                blueprint['commercial_intent']['pricing_summary']['ppu_total'] += asset.get('total_price', 0)
            elif sheet_type == 'RI':
                blueprint['commercial_intent']['pricing_summary']['ri_total'] += asset.get('total_price', 0)
            
            blueprint['commercial_intent']['pricing_summary']['total_quoted'] += asset.get('total_price', 0)
            
            # Add to blueprint
            blueprint['commercial_intent']['deployable_assets'].append(asset)
        
        # Merge account assets
        for asset in sheet_blueprint['commercial_intent']['account_assets']:
            asset['pricing_type'] = sheet_type
            blueprint['commercial_intent']['account_assets'].append(asset)
        
        # Merge topology (only from first sheet with data)
        if not blueprint['topology']['compute'] and sheet_blueprint['topology']['compute']:
            blueprint['topology'] = sheet_blueprint['topology']
    
    # Set currency from first asset if available
    if blueprint['commercial_intent']['deployable_assets']:
        blueprint['commercial_intent']['pricing_summary']['currency'] = blueprint['commercial_intent']['deployable_assets'][0].get('currency', 'USD')
    
    print(f"✅ Processed {len(blueprint['commercial_intent']['deployable_assets'])} deployable assets")
    print(f"💰 PPU Total: {blueprint['commercial_intent']['pricing_summary']['ppu_total']}")
    print(f"💰 RI Total: {blueprint['commercial_intent']['pricing_summary']['ri_total']}")
    print(f"💰 Total Quoted: {blueprint['commercial_intent']['pricing_summary']['total_quoted']}")
    
    return blueprint

def process_huawei_quotation_df(df: pd.DataFrame, customer_name: str, pricing_type: str = 'PPU') -> Dict[str, Any]:
    """
    Enhanced version of process_huawei_quotation that includes commercial details.
    """
    # Use the existing function as base
    blueprint = process_huawei_quotation(file_path=None, customer_name=customer_name)
    
    # We'll need to enhance this function to extract commercial details
    # For now, return the basic blueprint
    return blueprint