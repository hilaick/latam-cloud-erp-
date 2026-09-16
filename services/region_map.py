"""Huawei Cloud Region Code ↔ Region Name bidirectional mapping.

Reference only. The CLI profile name is per-customer-project (carries AK/SK from vault),
NOT derived from region name.

Region Name          Region Code
─────────────────────────────────
AP-Singapore         ap-southeast-3
AP-Bangkok           ap-southeast-2
AP-Jakarta           ap-southeast-4
AP-Manila            ap-southeast-5
CN-East-Shanghai1    cn-east-3
CN-East-Shanghai2    cn-east-2
CN-HongKong          ap-southeast-1
CN-North-Beijing1    cn-north-1
CN-North-Beijing4    cn-north-4
CN-South-Guangzhou   cn-south-1
CN-North-Ulanqab1    cn-north-9
CN-Southwest-Guiyang1 cn-southwest-2
CN-East-Qingdao      cn-east-5
TR-Istanbul          tr-west-1
AF-Johannesburg      af-south-1
LA-MexicoCity1       na-mexico-1
LA-MexicoCity2       la-north-2
LA-SaoPaulo1         sa-brazil-1
LA-Santiago          la-south-2
ME-Riyadh            me-east-1
AF-Cairo             af-north-1
CN-East2             cn-east-4
CN-North3            cn-north-12
"""

REGION_MAP = {
    "ap-southeast-3": "AP-Singapore",
    "ap-southeast-2": "AP-Bangkok",
    "ap-southeast-4": "AP-Jakarta",
    "ap-southeast-5": "AP-Manila",
    "cn-east-3": "CN-East-Shanghai1",
    "cn-east-2": "CN-East-Shanghai2",
    "ap-southeast-1": "CN-HongKong",
    "cn-north-1": "CN-North-Beijing1",
    "cn-north-4": "CN-North-Beijing4",
    "cn-south-1": "CN-South-Guangzhou",
    "cn-north-9": "CN-North-Ulanqab1",
    "cn-southwest-2": "CN-Southwest-Guiyang1",
    "cn-east-5": "CN-East-Qingdao",
    "tr-west-1": "TR-Istanbul",
    "af-south-1": "AF-Johannesburg",
    "na-mexico-1": "LA-MexicoCity1",
    "la-north-2": "LA-MexicoCity2",
    "sa-brazil-1": "LA-SaoPaulo1",
    "la-south-2": "LA-Santiago",
    "me-east-1": "ME-Riyadh",
    "af-north-1": "AF-Cairo",
    "cn-east-4": "CN-East2",
    "cn-north-12": "CN-North3",
}

NAME_TO_CODE = {v: k for k, v in REGION_MAP.items()}


def region_name(region_code: str) -> str:
    """Region code → human name. ap-southeast-3 → AP-Singapore."""
    if not region_code:
        return region_code
    if any(c.isupper() for c in region_code):
        return region_code
    return REGION_MAP.get(region_code, region_code)


def region_code(region_name_str: str) -> str:
    """Human name → region code. AP-Singapore → ap-southeast-3."""
    if not region_name_str:
        return region_name_str
    if region_name_str.islower() or all(c.islower() or c in '-0123456789' for c in region_name_str):
        return region_name_str
    return NAME_TO_CODE.get(region_name_str, region_name_str)
