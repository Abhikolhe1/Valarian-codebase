import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useReducer } from 'react';
// utils
import axios, { endpoints } from 'src/utils/axios';
//
import { HOST_API } from 'src/config-global';
import { AuthContext } from './auth-context';
import { isValidToken, setSession } from './utils';

// ----------------------------------------------------------------------

// NOTE:
// We only build demo at basic level.
// Customer will need to do some extra handling yourself if you want to extend the logic and other features...

// ----------------------------------------------------------------------

const initialState = {
  user: null,
  loading: true,
};

const reducer = (state, action) => {
  if (action.type === 'INITIAL') {
    return {
      loading: false,
      user: action.payload.user,
    };
  }
  if (action.type === 'LOGIN') {
    return {
      ...state,
      user: action.payload.user,
    };
  }
  if (action.type === 'REGISTER') {
    return {
      ...state,
      user: action.payload.user,
    };
  }
  if (action.type === 'LOGOUT') {
    return {
      ...state,
      user: null,
    };
  }
  return state;
};

// ----------------------------------------------------------------------

const STORAGE_KEY = 'accessToken';
const USER_STORAGE_KEY = 'user';
const AUTH_BOOTSTRAP_TIMEOUT = 2000;

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initialize = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEY);
      const storedUser = getStoredUser();

      console.log('Initializing frontend auth, token exists:', !!accessToken);
      if (accessToken && isValidToken(accessToken)) {
        console.log('Token is valid, setting session and fetching user');
        setSession(accessToken);

        dispatch({
          type: 'INITIAL',
          payload: {
            user: storedUser,
          },
        });

        axios
          .get(endpoints.auth.me, {
            timeout: AUTH_BOOTSTRAP_TIMEOUT,
          })
          .then((response) => {
            console.log('User data fetched from /me:', response.data);

            const user = response.data.user || response.data;

            console.log('userData', user);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

            dispatch({
              type: 'LOGIN',
              payload: {
                user,
              },
            });
          })
          .catch((error) => {
            console.error('Frontend auth refresh error:', error);
            console.error('Error response:', error.response?.data || error.message);

            const fallbackUser = getStoredUser();

            if (fallbackUser) {
              dispatch({
                type: 'LOGIN',
                payload: {
                  user: fallbackUser,
                },
              });
              return;
            }

            setSession(null);
            localStorage.removeItem(USER_STORAGE_KEY);

            dispatch({
              type: 'LOGIN',
              payload: {
                user: null,
              },
            });
          });
      } else {
        console.log('No valid token found in frontend');
        localStorage.removeItem(USER_STORAGE_KEY);
        dispatch({
          type: 'INITIAL',
          payload: {
            user: null,
          },
        });
      }
    } catch (error) {
      console.error('Frontend auth initialization error:', error);
      console.error('Error response:', error.response?.data || error.message);

      const fallbackUser = getStoredUser();

      if (fallbackUser) {
        dispatch({
          type: 'INITIAL',
          payload: {
            user: fallbackUser,
          },
        });
        return;
      }

      // Clear invalid session
      setSession(null);
      localStorage.removeItem(USER_STORAGE_KEY);

      dispatch({
        type: 'INITIAL',
        payload: {
          user: null,
        },
      });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // LOGIN
  const login = useCallback(async (email, password) => {
    const data = {
      email,
      password,
    };

    console.log('Attempting login with:', { email });

    const response = await axios.post(endpoints.auth.login, data);

    console.log('Login response:', response.data);

    const { accessToken } = response.data;

    console.log('Setting session with token');
    setSession(accessToken);

    // Fetch full user data from /me
    console.log('Fetching full user data from /me...');
    const meResponse = await axios.get(endpoints.auth.me);
    const user = meResponse.data.user || meResponse.data;

    console.log('User data from /me:', user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    dispatch({
      type: 'LOGIN',
      payload: {
        user,
      },
    });

    console.log('Login successful');
  }, []);

  // USER LOGIN (for regular users, not admin)
  const userLogin = useCallback(async (identifier, password, rememberMe = false) => {
    const data = {
      identifier,
      password,
      rememberMe,
    };

    console.log('Attempting user login with:', { identifier });

    const response = await axios.post('/api/auth/user/login', data);

    const { accessToken } = response.data;

    setSession(accessToken);

    // Fetch full user data from /me
    const meResponse = await axios.get(endpoints.auth.me);
    const user = meResponse.data.user || meResponse.data;

    // Store user data
    localStorage.setItem('user', JSON.stringify(user));

    dispatch({
      type: 'LOGIN',
      payload: {
        user,
      },
    });

    return { accessToken, user };
  }, []);

  // REGISTER

  // REGISTER
  const register = useCallback(async (email, password, firstName, lastName) => {
    const data = {
      email,
      password,
      firstName,
      lastName,
    };

    const response = await axios.post(endpoints.auth.register, data);

    const { accessToken } = response.data;

    setSession(accessToken);

    // Fetch full user data from /me
    const meResponse = await axios.get(endpoints.auth.me);
    const user = meResponse.data.user || meResponse.data;

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    dispatch({
      type: 'REGISTER',
      payload: {
        user,
      },
    });
  }, []);

  // USER REGISTER (for regular users, not admin)
  const userRegister = useCallback(async (userData) => {
    // userData should contain: phone, email (optional), password, fullName, sessionId
    const response = await axios.post('/api/auth/user/register', userData);

    const { accessToken } = response.data;

    setSession(accessToken);

    // Fetch full user data from /me
    const meResponse = await axios.get(endpoints.auth.me);
    const user = meResponse.data.user || meResponse.data;

    // Store user data
    localStorage.setItem('user', JSON.stringify(user));

    dispatch({
      type: 'REGISTER',
      payload: {
        user,
      },
    });

    return { accessToken, user };
  }, []);

  // OTP LOGIN (for OTP-based authentication)
  const otpLogin = useCallback(async (accessToken) => {
    console.log('Setting session with OTP accessToken');
    setSession(accessToken);

    // Fetch full user data from /me instead of relying on passed user
    console.log('Fetching full user data from /me...');
    const meResponse = await axios.get(endpoints.auth.me);
    const user = meResponse.data.user || meResponse.data;

    console.log('User data from /me:', user);

    // Store user data
    localStorage.setItem('user', JSON.stringify(user));

    dispatch({
      type: 'LOGIN',
      payload: {
        user,
      },
    });

    return { accessToken, user };
  }, []);

  const refreshUser = useCallback(async () => {
    const meResponse = await axios.get(endpoints.auth.me);
    const user = meResponse.data.user || meResponse.data;

    localStorage.setItem('user', JSON.stringify(user));

    dispatch({
      type: 'LOGIN',
      payload: {
        user,
      },
    });

    return user;
  }, []);

  // SEND OTP
  const sendOtp = useCallback(async (identifier, type = 'phone') => {
    console.log('Sending OTP to:', { identifier, type });

    try {
      const response = await axios.post(`${HOST_API}/api/auth/send-otp-login`, {
        identifier,
        type,
      });

      console.log('Send OTP response:', response.data);
      return response.data; // { success, message, otpId, isNewUser }
    } catch (error) {
      console.error('Send OTP error:', error);

      // Handle different error types
      if (error.response) {
        // Server responded with error
        const errorMessage = error.response.data?.message || 'Failed to send OTP';
        console.error('Server error:', errorMessage);
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request made but no response
        console.error('No response from server');
        throw new Error('Network error. Please check your connection.');
      } else {
        // Something else happened
        console.error('Error:', error.message);
        throw new Error(error.message || 'Failed to send OTP');
      }
    }
  }, []);

  // VERIFY OTP
  const verifyOtp = useCallback(async (otpId, otp, identifier) => {
    console.log('Verifying OTP...', { otpId, otp, identifier });

    try {
      const response = await axios.post(`${HOST_API}/api/auth/verify-otp-login`, {
        otpId,
        otp,
        identifier,
      });

      console.log('Verify OTP response:', response.data);

      const { accessToken, user } = response.data;

      console.log('Setting session with token', accessToken);
      setSession(accessToken);

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: 'LOGIN',
        payload: {
          user,
        },
      });

      console.log('OTP verification successful, user state updated');

      return {
        accessToken,
        user,
        isNewUser: response.data.isNewUser
      };
    } catch (error) {
      console.error('Verify OTP error:', error);

      // Handle different error types
      if (error.response) {
        // Server responded with error
        const errorMessage = error.response.data?.message || 'Invalid OTP';
        console.error('Server error:', errorMessage);
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request made but no response
        console.error('No response from server');
        throw new Error('Network error. Please check your connection.');
      } else {
        // Something else happened
        console.error('Error:', error.message);
        throw new Error(error.message || 'Failed to verify OTP');
      }
    }
  }, []);

  // LOGOUT
  const logout = useCallback(async () => {
    setSession(null);
    dispatch({
      type: 'LOGOUT',
    });
  }, []);

  // USER LOGOUT (for regular users, revokes refresh token)
  const userLogout = useCallback(async () => {
    try {
      // Call backend to revoke refresh token
      await axios.post('/api/auth/user/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setSession(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      dispatch({
        type: 'LOGOUT',
      });
    }
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user,
      method: 'jwt',
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      //
      login,
      register,
      logout,
      // User-specific methods
      userLogin,
      userRegister,
      userLogout,
      otpLogin,
      refreshUser,
      sendOtp,
      verifyOtp,
    }),
    [
      login,
      logout,
      register,
      userLogin,
      userRegister,
      userLogout,
      otpLogin,
      refreshUser,
      sendOtp,
      verifyOtp,
      state.user,
      status,
    ]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node,
};
