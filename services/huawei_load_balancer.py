#!/usr/bin/env python3
"""
Huawei ModelArts API Load Balancer
Rotates between 6 API keys to distribute rate limits
"""

import random
import time
import requests
import os

class HuaweiLoadBalancer:
    def __init__(self):
        # Your 6 Huawei ModelArts API keys
        self.keys = [
            os.environ.get("API_KEY_1", "WFpIs8g4-a9duqLicAqkeKnxttpD59SaoE_Snj7bzSobXd-pVm1cG25tNm1LTAOivvUc9DbNRB_1uZ2PWdh-jg"),
            os.environ.get("API_KEY_2", "Pm07QpkXOBV4hSXOr7A3Pc9FEw6qTugjgH2DUB7P8YU0zIJVVQXGXOwWL-j1s5-m0sIB6Ke-x0EvBGueTDgt4A"),
            os.environ.get("API_KEY_3", "wUYtlCORlXyiY0AUm8bUJp8ZvXqGO9o_4L_66scr729fcz-oI5YK43Z-0U2m1H8OnCC3hQ66IDMz4IDxeEdqeA"),
            os.environ.get("API_KEY_4", "0VIn_KTpCp1Cg4mc-nf7ABfXUdig4r2F2PDwNUWFaOaFFxJCTF6H0SN7X6Ce4q1IYifI6Uc5L04CO3YLd_U_gg"),
            os.environ.get("API_KEY_5", "0evwc0Er01n6hAKOn24AA5TSUPvuZqJkt4V2UxPzAU7BreKDHRjBIC2RPngFlwK3y0fH7lGkDueTW-RPfkxFkQ"),
            os.environ.get("API_KEY_6", "Bz2y-YeoTVoEPZMbEZ5yKhlGonGFqMDOqi30RVl_ke_kbYHRfocfAE3QgA7UAzMw4SEKaaxLlsK9TK4IxPyuXw")
        ]
        self.key_usage = {key: 0 for key in self.keys}
        self.key_errors = {key: 0 for key in self.keys}

    def get_status(self):
        masked_key_usage = {f"{k[:8]}...": v for k, v in self.key_usage.items()}
        masked_key_errors = {f"{k[:8]}...": v for k, v in self.key_errors.items()}
        return {
            "status": "Huawei ModelArts Load Balancer Active",
            "total_keys": len(self.keys),
            "key_usage": masked_key_usage,
            "key_errors": masked_key_errors
        }

    def chat_completion(self, request_data):
        available_keys = [k for k in self.keys if self.key_errors.get(k, 0) < 5]
        if not available_keys:
            available_keys = self.keys  # Fall back to all keys
        
        current_key = min(available_keys, key=lambda k: self.key_usage.get(k, 0))
        self.key_usage[current_key] += 1

        try:
            response = requests.post(
                "https://api-ap-southeast-1.modelarts-maas.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {current_key}",
                    "Content-Type": "application/json"
                },
                json=request_data,
                timeout=30
            )
            
            if response.status_code != 200:
                self.key_errors[current_key] += 1
            
            return response.json()
            
        except Exception as e:
            self.key_errors[current_key] += 1
            return {"error": str(e), "success": False}