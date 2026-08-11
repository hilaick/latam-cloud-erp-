"""
Huawei COC FinOps Service — Live Billing Data Fetcher

Provides methods to query Huawei Cloud BSS (Business Support System) APIs
for actual billing data, monthly breakdowns, and resource-level costs.
Used by the FinOps Dashboard and project-level FinOps Ledger.
"""
import logging
import requests
import json
from datetime import datetime
from urllib.parse import urlparse, parse_qsl, quote

try:
    from huaweicloudsdkcore.signer.signer import Signer
except ImportError:
    Signer = None

logger = logging.getLogger(__name__)


class _Credentials:
    """Duck-typed credentials for SDK v3.1+ that expects credentials.ak/sk."""
    def __init__(self, ak, sk):
        self.ak = ak
        self.sk = sk


class MockHttpRequest:
    """Duck-typed mock of Huawei's SdkRequest for manual V4 signing.

    SDK v3.1+ changed the interface: header_params (not headers),
    query_params (list of tuples, not dict), resource_path.
    """

    def __init__(self, method, url, body=""):
        self.method = method
        self.body = body
        self.header_params = {}

        parsed = urlparse(url)
        self.scheme = parsed.scheme
        self.host = parsed.netloc
        self.resource_path = quote(parsed.path) if parsed.path else "/"
        self.uri = self.resource_path

        self.query_params = []
        if parsed.query:
            for k, v in parse_qsl(parsed.query):
                self.query_params.append((k, v))


class HuaweiFinOpsService:
    """
    FinOps data fetcher for Huawei Cloud BSS APIs.
    Retrieves actual billing data (monthly summaries, resource-level costs)
    to power the COC FinOps Center dashboard.
    """

    # BSS API base — global endpoint, not regional
    BSS_BASE = "https://bss.myhuaweicloud.com"

    def __init__(self, raw_ak: str, raw_sk: str):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk

    def _get_signer(self):
        """Safely instantiate the Huawei V4 request signer."""
        if not Signer:
            return None
        try:
            return Signer(_Credentials(self.raw_ak, self.raw_sk))
        except Exception:
            return None

    def _signed_request(self, method, url, body=None, timeout=15):
        """Make a V4-signed request to a Huawei Cloud API endpoint."""
        signer = self._get_signer()
        if not signer:
            return {"success": False, "error": "Huawei SDK Signer unavailable"}

        req = MockHttpRequest(method, url, body=body or "")
        req.header_params = {"Content-Type": "application/json", "Accept": "application/json"}
        signer.sign(req)

        try:
            if method == "GET":
                resp = requests.get(req.scheme + "://" + req.host + req.uri, headers=req.header_params, timeout=timeout)
            elif method == "POST":
                resp = requests.post(req.scheme + "://" + req.host + req.uri, headers=req.header_params, data=body, timeout=timeout)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}

            if resp.status_code == 200:
                return {"success": True, "data": resp.json()}
            else:
                logger.warning(f"BSS API HTTP {resp.status_code}: {resp.text[:300]}")
                return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except requests.RequestException as e:
            logger.error(f"BSS API request failed: {e}")
            return {"success": False, "error": str(e)}

    def get_monthly_billing_summary(self, year_month: str) -> dict:
        """
        Fetch the monthly billing summary for a given YYYY-MM period.
        Returns total cost and per-service breakdown.

        Endpoint: GET /v2/bills/customer-bills/monthly-breakdown
        """
        url = f"{self.BSS_BASE}/v2/bills/customer-bills/monthly-breakdown?shared_cycle={year_month}"
        result = self._signed_request("GET", url)

        if not result.get("success"):
            return result

        data = result["data"]
        total = 0.0
        service_breakdown = {}

        # BSS response can be in different shapes depending on subcustomer vs direct
        bill_items = []
        if "bill_infos" in data:
            bill_items = data["bill_infos"]
        elif "monthly_bills" in data:
            bill_items = data["monthly_bills"]

        for item in bill_items:
            service = item.get("service_type_name", item.get("cloud_service_type_name", "Other"))
            amount = float(item.get("amount", item.get("real_amount", item.get("cash_amount", 0))))
            total += amount
            service_breakdown[service] = round(service_breakdown.get(service, 0) + amount, 2)

        return {
            "success": True,
            "total": round(total, 2),
            "service_breakdown": service_breakdown,
            "period": year_month,
            "bill_items_count": len(bill_items)
        }

    def get_current_month_billing(self) -> dict:
        """Get billing summary for the current calendar month."""
        now = datetime.utcnow()
        year_month = now.strftime("%Y-%m")
        return self.get_monthly_billing_summary(year_month)

    def get_billing_for_range(self, start_ym: str, end_ym: str) -> dict:
        """
        Get billing summaries for a range of months.
        Returns total across all months and per-month breakdown.
        """
        from datetime import datetime as dt
        start = dt.strptime(start_ym, "%Y-%m")
        end = dt.strptime(end_ym, "%Y-%m")

        monthly_data = []
        grand_total = 0.0
        aggregated_breakdown = {}
        errors = []

        current = start
        while current <= end:
            ym = current.strftime("%Y-%m")
            result = self.get_monthly_billing_summary(ym)
            if result.get("success"):
                monthly_data.append({
                    "period": ym,
                    "total": result["total"],
                    "breakdown": result["service_breakdown"]
                })
                grand_total += result["total"]
                for svc, amt in result["service_breakdown"].items():
                    aggregated_breakdown[svc] = round(aggregated_breakdown.get(svc, 0) + amt, 2)
            else:
                errors.append({"period": ym, "error": result.get("error")})
            # Next month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

        return {
            "success": True,
            "grand_total": round(grand_total, 2),
            "monthly_data": monthly_data,
            "aggregated_breakdown": aggregated_breakdown,
            "months_queried": len(monthly_data),
            "months_failed": len(errors),
            "errors": errors if errors else None
        }

    def get_resource_billing(self, year_month: str, resource_type_filter: str = None) -> dict:
        """
        Get per-resource billing details for a given month.
        Optionally filter by resource type (ECS, RDS, EVS, etc.).

        Endpoint: GET /v2/bills/customer-bills/resources
        """
        url = f"{self.BSS_BASE}/v2/bills/customer-bills/resources?shared_cycle={year_month}"
        if resource_type_filter:
            url += f"&resource_type={resource_type_filter}"
        url += "&limit=100"

        result = self._signed_request("GET", url)

        if not result.get("success"):
            return result

        data = result["data"]
        resources = data.get("resources", data.get("bill_details", []))
        total = 0.0
        resource_items = []

        for r in resources:
            amount = float(r.get("amount", r.get("real_amount", 0)))
            total += amount
            resource_items.append({
                "resource_id": r.get("resource_id", r.get("resource_instance_id", "")),
                "resource_name": r.get("resource_name", r.get("resource_instance_name", "Unknown")),
                "resource_type": r.get("resource_type_name", r.get("cloud_service_type_name", "Unknown")),
                "spec": r.get("spec_name", r.get("resource_spec", "")),
                "amount": round(amount, 2),
                "region": r.get("region_name", r.get("region_code", ""))
            })

        return {
            "success": True,
            "total": round(total, 2),
            "resource_count": len(resource_items),
            "resources": resource_items
        }

    def get_finops_snapshot(self, duration_months: int = 3) -> dict:
        """
        High-level FinOps snapshot: current month billing, recent trend,
        and RI coverage status. This is the primary data source for the
        COC FinOps Center dashboard.
        """
        now = datetime.utcnow()

        # Current month billing
        current_billing = self.get_current_month_billing()

        # Previous months for trend
        from datetime import datetime as dt
        end = now
        start = dt(now.year, now.month, 1)
        # Go back duration_months
        for _ in range(duration_months - 1):
            if start.month == 1:
                start = start.replace(year=start.year - 1, month=12)
            else:
                start = start.replace(month=start.month - 1)

        range_data = self.get_billing_for_range(start.strftime("%Y-%m"), end.strftime("%Y-%m"))

        # Compute daily burn rate (avg across months with data)
        daily_burn = 0.0
        if range_data.get("months_queried", 0) > 0:
            days_in_period = (end - start).days + 1
            daily_burn = round(range_data["grand_total"] / max(days_in_period, 1), 2)

        return {
            "success": True,
            "current_month": current_billing,
            "trend": range_data,
            "daily_burn_rate": daily_burn,
            "snapshot_at": now.isoformat()
        }
