// routes
import { paths } from 'src/routes/paths';
// utils
import axios from 'src/utils/axios';

// ----------------------------------------------------------------------

function jwtDecode(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      throw new Error('Invalid token format');
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    throw new Error('Failed to decode token');
  }
}

// ----------------------------------------------------------------------

export const isValidToken = (accessToken) => {
  if (!accessToken) {
    console.log('No access token provided');
    return false;
  }

  try {
    const decoded = jwtDecode(accessToken);

    console.log('Decoded token:', {
      exp: decoded.exp,
      expDate: decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'N/A',
      iat: decoded.iat,
      iatDate: decoded.iat ? new Date(decoded.iat * 1000).toLocaleString() : 'N/A',
    });

    if (!decoded.exp) {
      console.error('Token does not have expiration (exp) claim');
      return false;
    }

    const currentTime = Date.now() / 1000;
    const isValid = decoded.exp > currentTime;

    console.log('Token validation:', {
      currentTime,
      currentDate: new Date(currentTime * 1000).toLocaleString(),
      tokenExp: decoded.exp,
      tokenExpDate: new Date(decoded.exp * 1000).toLocaleString(),
      isValid,
      timeUntilExpiry: decoded.exp - currentTime,
      timeUntilExpiryMinutes: Math.floor((decoded.exp - currentTime) / 60),
    });

    return isValid;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

// ----------------------------------------------------------------------

export const tokenExpired = (exp) => {
  if (!exp) {
    console.error('Token expiration time (exp) is missing');
    return;
  }

  const currentTime = Date.now();
  const expTime = exp * 1000; // Convert to milliseconds
  const timeLeft = expTime - currentTime;

  console.log('Token expiration check:', {
    exp,
    expTime,
    expDate: new Date(expTime).toLocaleString(),
    currentTime,
    currentDate: new Date(currentTime).toLocaleString(),
    timeLeft,
    timeLeftMinutes: Math.floor(timeLeft / 1000 / 60),
    timeLeftHours: Math.floor(timeLeft / 1000 / 60 / 60),
    timeLeftDays: Math.floor(timeLeft / 1000 / 60 / 60 / 24),
  });

  // If token is already expired
  if (timeLeft <= 0) {
    console.error('Token is already expired!');
    alert('Token expired');
    sessionStorage.removeItem('accessToken');
    window.location.href = paths.auth.jwt.login;
    return;
  }

  // If token will expire in less than 1 minute, show warning but don't redirect yet
  if (timeLeft < 60000) {
    console.warn('Token will expire in less than 1 minute');
  }

  // Set timeout to show alert when token expires
  // Note: setTimeout has a maximum delay of ~24.8 days (2^31-1 milliseconds)
  const maxTimeout = 2147483647; // Maximum setTimeout value
  const timeoutDelay = Math.min(timeLeft, maxTimeout);

  console.log('Setting token expiration timeout for:', timeoutDelay, 'ms');

  const expiredTimer = setTimeout(() => {
    console.log('Token has expired, redirecting to login');
    alert('Token expired');
    sessionStorage.removeItem('accessToken');
    window.location.href = paths.auth.jwt.login;
  }, timeoutDelay);

  // Store timer ID so it can be cleared if needed
  if (typeof window !== 'undefined') {
    window.__tokenExpirationTimer = expiredTimer;
  }
};

// ----------------------------------------------------------------------

export const setSession = (accessToken) => {
  if (accessToken) {
    sessionStorage.setItem('accessToken', accessToken);

    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    // This function below will handle when token is expired
    const { exp } = jwtDecode(accessToken); // ~3 days by Valiarian server
    tokenExpired(exp);
  } else {
    sessionStorage.removeItem('accessToken');

    delete axios.defaults.headers.common.Authorization;
  }
};
