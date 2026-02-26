import axios from 'axios';
// config
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: HOST_API });

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong')
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
  cart: {
    get: (userId) => `/api/cart/${userId}`,
  },
  favorites: {
    get: (userId) => `/api/favorites/${userId}`,
  },
  orders: {
    user: (userId) => `/api/orders/user/${userId}`,
    details: (orderId) => `/api/orders/${orderId}`,
    tracking: (orderId) => `/api/orders/${orderId}/tracking`,
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
