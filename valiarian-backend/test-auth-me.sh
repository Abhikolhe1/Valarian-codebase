#!/bin/bash

# Test script for /api/auth/me endpoint

echo "Testing /api/auth/me endpoint..."
echo ""

# Test 1: Without authentication (should return 401)
echo "Test 1: GET /api/auth/me without token (expect 401)"
curl -X GET http://localhost:3035/api/auth/me \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo "---"
echo ""

# Test 2: Login and get token
echo "Test 2: Login to get token"
echo "POST /api/auth/super-admin-login"
LOGIN_RESPONSE=$(curl -X POST http://localhost:3035/api/auth/super-admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123",
    "rememberMe": true
  }' \
  -s)

echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "Token obtained successfully!"
  echo ""
  echo "---"
  echo ""

  # Test 3: With authentication (should return user data)
  echo "Test 3: GET /api/auth/me with token (expect 200)"
  curl -X GET http://localhost:3035/api/auth/me \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq '.'
else
  echo "Failed to obtain token. Please check:"
  echo "1. Backend server is running on port 3035"
  echo "2. Super admin user exists with correct credentials"
  echo "3. Database is accessible"
fi

echo ""
echo "Test complete!"
