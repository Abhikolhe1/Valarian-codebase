import axios from 'axios';
// config
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: HOST_API });

// Request interceptor to ensure Authorization header is sent
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = sessionStorage.getItem('accessToken');
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
    adminLogin: '/api/auth/super-admin-login',
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
    list: '/api/products',
    details: (id) => `/api/products/${id}`,
    create: '/api/products',
    update: (id) => `/api/products/${id}`,
    delete: (id) => `/api/products/${id}`,
    publish: (id) => `/api/products/${id}/publish`,
    archive: (id) => `/api/products/${id}/archive`,
    variants: {
      list: (productId) => `/api/products/${productId}/variants`,
      details: (productId, variantId) => `/api/products/${productId}/variants/${variantId}`,
      create: (productId) => `/api/products/${productId}/variants`,
      update: (productId, variantId) => `/api/products/${productId}/variants/${variantId}`,
      delete: (productId, variantId) => `/api/products/${productId}/variants/${variantId}`,
      updateStock: (productId, variantId) => `/api/products/${productId}/variants/${variantId}/stock`,
      availability: (productId, variantId) => `/api/products/${productId}/variants/${variantId}/availability`,
    },
  },
  cms: {
    pages: {
      list: '/api/cms/pages',
      details: (id) => `/api/cms/pages/${id}`,
      bySlug: (slug) => `/api/cms/pages/${slug}`,
      publish: (id) => `/api/cms/pages/${id}/publish`,
      duplicate: (id) => `/api/cms/pages/${id}/duplicate`,
      versions: (id) => `/api/cms/pages/${id}/versions`,
      revert: (id, versionId) => `/api/cms/pages/${id}/revert/${versionId}`,
    },
    sections: {
      list: '/api/cms/sections',
      details: (id) => `/api/cms/sections/${id}`,
      reorder: '/api/cms/sections/reorder',
    },
    media: {
      list: '/api/cms/media',
      details: (id) => `/api/cms/media/${id}`,
      upload: '/api/cms/media/upload',
      folders: '/api/cms/media/folders',
    },
    templates: {
      list: '/api/cms/templates',
      details: (id) => `/api/cms/templates/${id}`,
    },
    navigation: {
      list: '/api/cms/navigation',
      byLocation: (location) => `/api/cms/navigation/${location}`,
      details: (id) => `/api/cms/navigation/${id}`,
    },
    settings: '/api/cms/settings',
  },
};
