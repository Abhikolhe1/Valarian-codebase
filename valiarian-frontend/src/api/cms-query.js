import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------
// QUERY KEYS
// ----------------------------------------------------------------------

export const cmsKeys = {
  all: ['cms'],
  pages: () => [...cmsKeys.all, 'pages'],
  pagesList: (params) => [...cmsKeys.pages(), 'list', params],
  page: (id) => [...cmsKeys.pages(), 'detail', id],
  pageBySlug: (slug) => [...cmsKeys.pages(), 'slug', slug],
  pageVersions: (id) => [...cmsKeys.pages(), id, 'versions'],

  sections: () => [...cmsKeys.all, 'sections'],
  sectionsList: (pageId) => [...cmsKeys.sections(), 'list', pageId],
  section: (id) => [...cmsKeys.sections(), 'detail', id],

  media: () => [...cmsKeys.all, 'media'],
  mediaList: (params) => [...cmsKeys.media(), 'list', params],
  mediaItem: (id) => [...cmsKeys.media(), 'detail', id],

  navigation: () => [...cmsKeys.all, 'navigation'],
  navigationByLocation: (location) => [...cmsKeys.navigation(), location],

  settings: () => [...cmsKeys.all, 'settings'],
};

// ----------------------------------------------------------------------
// API FUNCTIONS
// ----------------------------------------------------------------------

// Pages API
const fetchPages = async (params = {}) => {
  const response = await axiosInstance.get(endpoints.cms.pages.list, { params });
  return response.data;
};

const fetchPage = async (pageId) => {
  const response = await axiosInstance.get(endpoints.cms.pages.byId(pageId));
  return response.data;
};

const fetchPageBySlug = async (slug) => {
  const response = await axiosInstance.get(endpoints.cms.pages.bySlug(slug));
  return response.data;
};

const fetchPageVersions = async (pageId) => {
  const response = await axiosInstance.get(endpoints.cms.pages.versions(pageId));
  return response.data;
};

// Sections API
const fetchSections = async (pageId) => {
  const response = await axiosInstance.get(endpoints.cms.sections.list, {
    params: { pageId },
  });
  return response.data;
};

const fetchSection = async (sectionId) => {
  const response = await axiosInstance.get(endpoints.cms.sections.byId(sectionId));
  return response.data;
};

// Media API
const fetchMedia = async (params = {}) => {
  const response = await axiosInstance.get(endpoints.cms.media.list, { params });
  return response.data;
};

const fetchMediaItem = async (mediaId) => {
  const response = await axiosInstance.get(endpoints.cms.media.byId(mediaId));
  return response.data;
};

// Navigation API
const fetchNavigation = async (location) => {
  const response = await axiosInstance.get(endpoints.cms.navigation.byLocation(location));
  return response.data;
};

// Settings API
const fetchSettings = async () => {
  const response = await axiosInstance.get(endpoints.cms.settings);
  return response.data;
};

// ----------------------------------------------------------------------
// PAGES HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch all pages with optional filtering
 * @param {Object} params - Query parameters (status, search, page, limit)
 * @param {Object} options - React Query options
 */
export function usePages(params = {}, options = {}) {
  return useQuery({
    queryKey: cmsKeys.pagesList(params),
    queryFn: () => fetchPages(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single page by ID (for admin)
 * @param {string} pageId - Page ID
 * @param {Object} options - React Query options
 */
export function usePage(pageId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.page(pageId),
    queryFn: () => fetchPage(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single page by slug (for public pages)
 * @param {string} slug - Page slug
 * @param {Object} options - React Query options
 */
export function usePageBySlug(slug, options = {}) {
  return useQuery({
    queryKey: cmsKeys.pageBySlug(slug),
    queryFn: () => fetchPageBySlug(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes (longer for public pages)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Hook to fetch page versions
 * @param {string} pageId - Page ID
 * @param {Object} options - React Query options
 */
export function usePageVersions(pageId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.pageVersions(pageId),
    queryFn: () => fetchPageVersions(pageId),
    enabled: !!pageId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ----------------------------------------------------------------------
// SECTIONS HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch sections for a page
 * @param {string} pageId - Page ID
 * @param {Object} options - React Query options
 */
export function useSections(pageId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.sectionsList(pageId),
    queryFn: () => fetchSections(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single section
 * @param {string} sectionId - Section ID
 * @param {Object} options - React Query options
 */
export function useSection(sectionId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.section(sectionId),
    queryFn: () => fetchSection(sectionId),
    enabled: !!sectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ----------------------------------------------------------------------
// MEDIA HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch media library with optional filtering
 * @param {Object} params - Query parameters (folder, mimeType, search, page, limit)
 * @param {Object} options - React Query options
 */
export function useMedia(params = {}, options = {}) {
  return useQuery({
    queryKey: cmsKeys.mediaList(params),
    queryFn: () => fetchMedia(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single media item
 * @param {string} mediaId - Media ID
 * @param {Object} options - React Query options
 */
export function useMediaItem(mediaId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.mediaItem(mediaId),
    queryFn: () => fetchMediaItem(mediaId),
    enabled: !!mediaId,
    staleTime: 10 * 60 * 1000, // 10 minutes (media rarely changes)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// ----------------------------------------------------------------------
// NAVIGATION HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch navigation menu by location
 * @param {string} location - Menu location (header, footer, sidebar, mobile)
 * @param {Object} options - React Query options
 */
export function useNavigation(location, options = {}) {
  return useQuery({
    queryKey: cmsKeys.navigationByLocation(location),
    queryFn: () => fetchNavigation(location),
    enabled: !!location,
    staleTime: 15 * 60 * 1000, // 15 minutes (navigation rarely changes)
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });
}

// ----------------------------------------------------------------------
// SETTINGS HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch site settings
 * @param {Object} options - React Query options
 */
export function useSettings(options = {}) {
  return useQuery({
    queryKey: cmsKeys.settings(),
    queryFn: fetchSettings,
    staleTime: 15 * 60 * 1000, // 15 minutes (settings rarely change)
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });
}

// ----------------------------------------------------------------------
// MUTATION HOOKS (for future use)
// ----------------------------------------------------------------------

/**
 * Hook to invalidate CMS cache
 */
export function useInvalidateCMS() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: cmsKeys.all }),
    invalidatePages: () => queryClient.invalidateQueries({ queryKey: cmsKeys.pages() }),
    invalidatePage: (id) => queryClient.invalidateQueries({ queryKey: cmsKeys.page(id) }),
    invalidateSections: () => queryClient.invalidateQueries({ queryKey: cmsKeys.sections() }),
    invalidateMedia: () => queryClient.invalidateQueries({ queryKey: cmsKeys.media() }),
    invalidateNavigation: () => queryClient.invalidateQueries({ queryKey: cmsKeys.navigation() }),
    invalidateSettings: () => queryClient.invalidateQueries({ queryKey: cmsKeys.settings() }),
  };
}
