import axios from 'axios';
// config
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

const AUTH_FAILURE_EVENT = 'valiarian-auth-failure';

const triggerAuthFailure = (error) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  window.dispatchEvent(
    new CustomEvent(AUTH_FAILURE_EVENT, {
      detail: {
        status: error?.response?.status,
        message: error?.response?.data?.message || error?.message || 'Authentication failed',
      },
    })
  );
};

const axiosInstance = axios.create({
  baseURL: HOST_API,
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor - Add JWT token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      error.status = error.response.status;
      error.statusCode = error.response.status;
      error.data = error.response.data;

      if (error.response.data?.message) {
        error.message = error.response.data.message;
      }

      const requestUrl = error.config?.url || '';
      const isAuthFailure = [401, 403].includes(error.response.status);
      const isLogoutRequest = requestUrl.includes('/api/auth/user/logout');

      if (isAuthFailure && !isLogoutRequest) {
        triggerAuthFailure(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosInstance.get(url, { ...config });

  return res.data;
};

// ----------------------------------------------------------------------

export const endpoints = {
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  auth: {
    me: '/api/auth/me',
    login: '/api/auth/login',
    register: '/api/auth/register',
  },
  user: {
    profile: '/api/users/profile',
  },
  category: {
    list: '/api/categories',
    tree: '/api/categories/tree',
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  products: {
    list: '/api/public/products',
    details: (slug) => `/api/public/products/${slug}`,
    newArrivals: '/api/public/products/new-arrivals',
    bestSellers: '/api/public/products/best-sellers',
    featured: '/api/public/products/featured',
  },
  reviews: {
    create: '/api/reviews',
    details: (id) => `/api/reviews/${id}`,
    byProduct: (productId) => `/api/reviews/product/${productId}`,
  },
  cart: {
    get: (userId) => `/api/cart/${userId}`,
  },
  favorites: {
    get: (userId) => `/api/favorites/${userId}`,
    add: '/api/favorites',
    remove: (productId) => `/api/favorites/${productId}`,
  },
  orders: {
    create: '/api/orders/create',
    user: (userId) => `/api/orders/user/${userId}`,
    details: (orderId) => `/api/orders/${orderId}`,
    tracking: (orderId) => `/api/orders/${orderId}/tracking`,
    return: (orderId) => `/api/orders/${orderId}/return`,
  },
  premiumPreorders: {
    create: '/api/premium-preorders/create',
    verify: '/api/premium-preorders/verify',
    paymentFailed: (preorderId) => `/api/premium-preorders/${preorderId}/payment-failed`,
    details: (preorderId) => `/api/premium-preorders/${preorderId}`,
    user: (userId) => `/api/premium-preorders/user/${userId}`,
  },
  payments: {
    verify: '/api/payments/verify',
  },
  contact: {
    create: '/api/public/contact-submissions',
  },
  upload: {
    root: '/files',
  },
  cms: {
    pages: {
      list: '/api/cms/pages',
      bySlug: (slug) => `/api/cms/pages/${slug}`,
      byId: (id) => `/api/cms/pages/${id}`,
      versions: (id) => `/api/cms/pages/${id}/versions`,
    },
    sections: {
      list: '/api/cms/sections',
      byId: (id) => `/api/cms/sections/${id}`,
    },
    media: {
      list: '/api/cms/media',
      byId: (id) => `/api/cms/media/${id}`,
    },
    navigation: {
      byLocation: (location) => `/api/cms/navigation/${location}`,
    },
    settings: '/api/cms/settings',
  },
};
