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

  const expiredTimer = setTimeout(() => {
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
