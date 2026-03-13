// routes
import { paths } from 'src/routes/paths';
// utils
import axios from 'src/utils/axios';

// ----------------------------------------------------------------------

function jwtDecode(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split('')
      .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join('')
  );

  console.log('JSON.parse(jsonPayload)', JSON.parse(jsonPayload));
  return JSON.parse(jsonPayload);
}

// ----------------------------------------------------------------------

export const isValidToken = (accessToken) => {
  if (!accessToken) {
    return false;
  }

  const decoded = jwtDecode(accessToken);

  const currentTime = Date.now() / 1000;

  return decoded.exp > currentTime;
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
    localStorage.removeItem('accessToken');
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
    localStorage.removeItem('accessToken');
    window.location.href = paths.auth.jwt.login;
  }, timeoutDelay);

  // Store timer ID so it can be cleared if needed
  if (typeof window !== 'undefined') {
    window.__tokenExpirationTimer = expiredTimer;
  }
};

// ----------------------------------------------------------------------

export const setSession = (accessToken) => {
  console.log('session token', accessToken);

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);

    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    const decoded = jwtDecode(accessToken);

    if (decoded?.exp) {
      tokenExpired(decoded.exp);
    }
  } else {
    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common.Authorization;
  }
};
