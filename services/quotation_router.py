#!/usr/bin/env python3
"""
Quotation Format Router
Detects the quotation file format and dispatches to the appropriate parser.
Does NOT modify existing parsers — purely a routing layer.

Supported formats:
  - Standard Huawei quotation (excel_ingestor.py)
  - Enhanced multi-sheet PPU/RI (enhanced_excel_ingestor.py)
  - Pricing Calculator export C&C v3.0 (pricing_calculator_parser.py)
  - Pricing Calculator share URL (pricing_calculator_parser.py)
"""

from typing import Dict, Any, Optional
from services.excel_ingestor import process_huawei_quotation as parse_standard
from services.pricing_calculator_parser import (
    is_pricing_calculator_format,
    is_pricing_calculator_url,
    parse_pricing_calculator,
    parse_from_share_url
)


def process_quotation(file_path_or_url: str, customer_name: str = "TBD_Customer") -> Dict[str, Any]:
    """
    Main entry point for quotation parsing.
    Automatically detects the format and routes to the correct parser.
    
    Args:
        file_path_or_url: Path to an Excel/CSV file, or a Huawei Cloud Pricing Calculator share URL
        customer_name: Customer name for the blueprint
        
    Returns:
        Standard blueprint.json dict with topology + commercial_intent
    """
    # Check if it's a URL
    if is_pricing_calculator_url(file_path_or_url):
        print(f"🔗 Detected Pricing Calculator share URL")
        blueprint = parse_from_share_url(file_path_or_url, customer_name)
        return blueprint
    
    # Check if it's a file path
    file_path = file_path_or_url
    
    # Try Pricing Calculator format first (detection is fast and specific)
    if is_pricing_calculator_format(file_path):
        print(f"📊 Detected Pricing Calculator export format (C&C v3.0)")
        return parse_pricing_calculator(file_path, customer_name)
    
    # Try enhanced multi-sheet parser
    try:
        from services.enhanced_excel_ingestor import process_multi_sheet_quotation
        print(f"📊 Trying Enhanced multi-sheet parser...")
        return process_multi_sheet_quotation(file_path, customer_name)
    except ImportError:
        pass
    
    # Fall back to standard Huawei quotation parser
    print(f"📄 Using Standard quotation parser")
    return parse_standard(file_path, customer_name)


def detect_format(file_path_or_url: str) -> str:
    """
    Detect the quotation format without parsing.
    Returns a format identifier string.
    """
    if is_pricing_calculator_url(file_path_or_url):
        return "pricing_calculator_url"
    
    if is_pricing_calculator_format(file_path_or_url):
        return "pricing_calculator_v3"
    
    # Try checking for enhanced multi-sheet
    try:
        from services.enhanced_excel_ingestor import load_all_excel_sheets
        sheets = load_all_excel_sheets(file_path_or_url)
        if len(sheets) > 1:
            return "enhanced_multi_sheet"
    except Exception:
        pass
    
    return "standard_huawei"
