import { PATH_AFTER_LOGIN } from 'src/config-global';

const RETURN_PATH_KEY = 'returnPath';

const isSafeReturnPath = (value) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

export const setStoredReturnPath = (path) => {
  if (typeof window === 'undefined' || !isSafeReturnPath(path)) {
    return;
  }

  sessionStorage.setItem(RETURN_PATH_KEY, path);
};

export const getStoredReturnPath = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = sessionStorage.getItem(RETURN_PATH_KEY);
  return isSafeReturnPath(value) ? value : null;
};

export const clearStoredReturnPath = () => {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(RETURN_PATH_KEY);
};

export const buildAuthRouteWithReturnTo = (route, returnTo) => {
  if (!isSafeReturnPath(returnTo)) {
    return route;
  }

  const searchParams = new URLSearchParams({ returnTo });
  return `${route}?${searchParams.toString()}`;
};

export const resolveAuthRedirect = (searchParams) => {
  const queryReturnTo = searchParams?.get?.('returnTo');
  const storedReturnTo = getStoredReturnPath();

  const target = [queryReturnTo, storedReturnTo, PATH_AFTER_LOGIN].find(isSafeReturnPath) || PATH_AFTER_LOGIN;

  clearStoredReturnPath();

  return target;
};
