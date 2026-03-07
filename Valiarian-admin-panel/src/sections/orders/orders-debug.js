import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from 'src/utils/axios';

/**
 * Debug component to diagnose why orders aren't showing
 * Add this to orders-list-view.js temporarily to debug
 */
export default function OrdersDebug() {
  const [debugInfo, setDebugInfo] = useState({
    token: null,
    apiBase: null,
    apiStatus: null,
    apiResponse: null,
    error: null,
  });

  const runDiagnostic = async () => {
    const info = {};

    // Check 1: Token
    info.token = sessionStorage.getItem('accessToken');
    info.tokenExists = !!info.token;

    // Check 2: API Base
    info.apiBase = process.env.REACT_APP_HOST_API || 'http://localhost:3035';

    // Check 3: Test API
    try {
      const response = await axios.get('/api/admin/orders', {
        params: { page: 1, limit: 20 }
      });

      info.apiStatus = 200;
      info.apiResponse = response.data;
      info.ordersCount = response.data.orders?.length || 0;
      info.totalInDb = response.data.pagination?.total || 0;
      info.success = true;
    } catch (error) {
      info.apiStatus = error.response?.status || 'Network Error';
      info.error = error.response?.data || error.message;
      info.success = false;
    }

    setDebugInfo(info);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🔍 Orders Debug Information
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">1. Authentication</Typography>
          <Alert severity={debugInfo.tokenExists ? 'success' : 'error'} sx={{ mt: 1 }}>
            Token: {debugInfo.tokenExists ? '✅ Exists' : '❌ Missing - Please login'}
          </Alert>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">2. API Configuration</Typography>
          <Alert severity="info" sx={{ mt: 1 }}>
            API Base: {debugInfo.apiBase}
          </Alert>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">3. API Response</Typography>
          {debugInfo.apiStatus === 200 ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              ✅ API Working!
              <br />
              Orders in response: {debugInfo.ordersCount}
              <br />
              Total in database: {debugInfo.totalInDb}
            </Alert>
          ) : debugInfo.apiStatus === 401 ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              ❌ 401 Unauthorized
              <br />
              Token is invalid or expired. Please login again.
            </Alert>
          ) : debugInfo.apiStatus === 403 ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              ❌ 403 Forbidden
              <br />
              User is not super_admin. Login with super admin account.
            </Alert>
          ) : debugInfo.apiStatus ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              ❌ Error {debugInfo.apiStatus}
              <br />
              {JSON.stringify(debugInfo.error)}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              Testing API...
            </Alert>
          )}
        </Box>

        {debugInfo.success && debugInfo.ordersCount === 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning">
              ⚠️ No orders in database
              <br />
              Run: npm run seed:test-orders (in valiarian-backend)
            </Alert>
          </Box>
        )}

        {debugInfo.success && debugInfo.ordersCount > 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">
              ✅ Everything looks good!
              <br />
              If orders still not showing, check browser console for React errors.
            </Alert>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1, overflow: 'auto', maxHeight: 300 }}>
              <Typography variant="caption" component="pre">
                {JSON.stringify(debugInfo.apiResponse, null, 2)}
              </Typography>
            </Box>
          </Box>
        )}

        <Button variant="outlined" onClick={runDiagnostic} sx={{ mt: 2 }}>
          🔄 Run Diagnostic Again
        </Button>
      </CardContent>
    </Card>
  );
}
