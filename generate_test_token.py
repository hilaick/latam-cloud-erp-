#!/usr/bin/env python3
import jwt
import datetime
import json

# Use the same secret as Flask app
JWT_SECRET_KEY = "super-secret-latam-erp-key-2026!"

# Create a test token for user ID 1 (hilaick@latamcloud.com)
payload = {
    "sub": "1",  # Subject (user ID)
    "iat": datetime.datetime.utcnow(),  # Issued at
    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8),  # Expires in 8 hours
    "role": "Master Admin",  # Role
    "name": "Hilaick Yard"  # Name
}

# Generate token
token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

print(f"Generated JWT token: {token}")
print("\nPayload:")
print(json.dumps(payload, default=str, indent=2))

# Test the token
print("\n\nTesting token verification...")
try:
    decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    print("Token is valid!")
    print("Decoded payload:")
    print(json.dumps(decoded, indent=2))
except Exception as e:
    print(f"Token verification failed: {e}")