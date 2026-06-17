# Backend Restart Instructions

## Issue
The admin panel is still trying to access the old endpoint `/auth/super-admin-login` instead of the new `/api/auth/super-admin-login`.

## Root Cause
The backend server is running with the old compiled code. The TypeScript source has been updated and compiled, but the server needs to be restarted to load the new code.

## Solution

### Step 1: Stop the Current Backend Server
If the backend is running, stop it:
- Press `Ctrl+C` in the terminal where the backend is running
- Or kill the process manually

### Step 2: Verify the Build
The code has already been compiled. You can verify by checking:
```bash
cd valiarian-backend
npm run build
```

Expected output:
```
> Valiarian-backend@0.0.1 build
> lb-tsc

✓ Build successful
```

### Step 3: Start the Backend Server
```bash
cd valiarian-backend
npm start
```

Expected output:
```
Server is running at http://127.0.0.1:3035
Try http://127.0.0.1:3035/ping
```

### Step 4: Verify the Endpoints
Test that the new endpoints are working:

**Test 1: Check /api/auth/me (should return 401 without token)**
```bash
curl http://localhost:3035/api/auth/me
```

Expected response:
```json
{"error":{"statusCode":401,"name":"UnauthorizedError","message":"Authorization header is missing"}}
```

**Test 2: Check old endpoint is gone (should return 404)**
```bash
curl http://localhost:3035/auth/super-admin-login -X POST
```

Expected response:
```json
{"error":{"statusCode":404,"name":"NotFoundError","message":"Endpoint \"POST /auth/super-admin-login\" not found."}}
```

**Test 3: Check new endpoint exists (should return 400 for missing data)**
```bash
curl http://localhost:3035/api/auth/super-admin-login -X POST -H "Content-Type: application/json" -d '{}'
```

Expected response (validation error, not 404):
```json
{"error":{"statusCode":400,...}}
```

### Step 5: Test Login from Admin Panel
1. Open admin panel in browser
2. Clear browser cache (Ctrl+Shift+Delete)
3. Clear session storage (F12 → Application → Session Storage → Clear)
4. Try logging in with super admin credentials
5. Should successfully log in and redirect to dashboard

## Verification Checklist

- [ ] Backend server stopped
- [ ] Code compiled successfully (`npm run build`)
- [ ] Backend server restarted (`npm start`)
- [ ] New endpoint `/api/auth/super-admin-login` returns 400 (not 404)
- [ ] Old endpoint `/auth/super-admin-login` returns 404
- [ ] `/api/auth/me` endpoint returns 401 (not 404)
- [ ] Admin panel login works
- [ ] Session persists on page refresh

## Troubleshooting

### Issue: Port 3035 already in use
**Solution:**
```bash
# Windows
netstat -ano | findstr :3035
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3035 | xargs kill -9
```

### Issue: Still getting 404 on new endpoints
**Solution:**
1. Make sure you're in the correct directory: `cd valiarian-backend`
2. Rebuild: `npm run build`
3. Check for TypeScript errors in the build output
4. Restart the server

### Issue: Admin panel still uses old endpoint
**Solution:**
1. Clear browser cache completely
2. Hard refresh the admin panel (Ctrl+Shift+R)
3. Check browser DevTools → Network tab to see actual request URL
4. Verify `src/utils/axios.js` has the correct endpoint

## Quick Commands

```bash
# Stop, rebuild, and restart backend
cd valiarian-backend
# Stop with Ctrl+C if running
npm run build
npm start

# In another terminal, test endpoints
curl http://localhost:3035/api/auth/me
curl http://localhost:3035/api/auth/super-admin-login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test","rememberMe":true}'
```

## Expected Behavior After Restart

### Old Endpoints (Should NOT work - 404)
- ❌ `POST /auth/super-admin-login`
- ❌ `POST /auth/super-admin`
- ❌ `GET /auth/me`
- ❌ `POST /auth/update-password`

### New Endpoints (Should work - 401/400/200)
- ✅ `POST /api/auth/super-admin-login`
- ✅ `POST /api/auth/super-admin`
- ✅ `GET /api/auth/me`
- ✅ `POST /api/auth/update-password`
- ✅ `POST /api/auth/send-phone-otp`
- ✅ `POST /api/auth/verify-phone-otp`
- ✅ `POST /api/auth/send-email-otp`
- ✅ `POST /api/auth/verify-email-otp`
- ✅ `POST /api/auth/forget-password/send-email-otp`
- ✅ `POST /api/auth/forget-password/verify-email-otp`

## Notes

- The compiled JavaScript files in `dist/` folder have the correct endpoints
- The TypeScript source files in `src/` folder have been updated
- The server must be restarted to load the new compiled code
- Browser cache should be cleared to avoid using old API calls

## Next Steps After Restart

1. Test login flow in admin panel
2. Verify session persistence on page refresh
3. Check that user data loads correctly
4. Monitor server logs for any errors
5. Update any API documentation if needed
