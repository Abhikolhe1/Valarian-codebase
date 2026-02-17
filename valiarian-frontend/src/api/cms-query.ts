import {useQuery, useQueryClient, UseQueryOptions} from '@tanstack/react-query';
import axiosInstance, {endpoints} from 'src/utils/axios';
// types
import type {
  MediaListParams,
  MediaListResponse,
  MediaResponse,
  NavigationLocation,
  NavigationResponse,
  PageResponse,
  PagesListParams,
  PagesListResponse,
  PageVersionsResponse,
  SectionResponse,
  SectionsListResponse,
  SettingsResponse
} from 'src/types/cms';

// ----------------------------------------------------------------------
// QUERY KEYS
// ----------------------------------------------------------------------

export const cmsKeys = {
  all: ['cms'] as const,
  pages: () => [...cmsKeys.all, 'pages'] as const,
  pagesList: (params?: PagesListParams) => [...cmsKeys.pages(), 'list', params] as const,
  page: (id: string) => [...cmsKeys.pages(), 'detail', id] as const,
  pageBySlug: (slug: string) => [...cmsKeys.pages(), 'slug', slug] as const,
  pageVersions: (id: string) => [...cmsKeys.pages(), id, 'versions'] as const,

  sections: () => [...cmsKeys.all, 'sections'] as const,
  sectionsList: (pageId?: string) => [...cmsKeys.sections(), 'list', pageId] as const,
  section: (id: string) => [...cmsKeys.sections(), 'detail', id] as const,

  media: () => [...cmsKeys.all, 'media'] as const,
  mediaList: (params?: MediaListParams) => [...cmsKeys.media(), 'list', params] as const,
  mediaItem: (id: string) => [...cmsKeys.media(), 'detail', id] as const,

  navigation: () => [...cmsKeys.all, 'navigation'] as const,
  navigationByLocation: (location: NavigationLocation) =>
    [...cmsKeys.navigation(), location] as const,

  settings: () => [...cmsKeys.all, 'settings'] as const,
};

// ----------------------------------------------------------------------
// API FUNCTIONS
// ----------------------------------------------------------------------

// Pages API
const fetchPages = async (params: PagesListParams = {}): Promise<PagesListResponse> => {
  const response = await axiosInstance.get<PagesListResponse>(endpoints.cms.pages.list, {
    params,
  });
  return response.data;
};

const fetchPage = async (pageId: string): Promise<PageResponse> => {
  const response = await axiosInstance.get<PageResponse>(endpoints.cms.pages.byId(pageId));
  return response.data;
};

const fetchPageBySlug = async (slug: string): Promise<PageResponse> => {
  const response = await axiosInstance.get<PageResponse>(endpoints.cms.pages.bySlug(slug));
  return response.data;
};

const fetchPageVersions = async (pageId: string): Promise<PageVersionsResponse> => {
  const response = await axiosInstance.get<PageVersionsResponse>(
    endpoints.cms.pages.versions(pageId)
  );
  return response.data;
};

// Sections API
const fetchSections = async (pageId: string): Promise<SectionsListResponse> => {
  const response = await axiosInstance.get<SectionsListResponse>(endpoints.cms.sections.list, {
    params: {pageId},
  });
  return response.data;
};

const fetchSection = async (sectionId: string): Promise<SectionResponse> => {
  const response = await axiosInstance.get<SectionResponse>(
    endpoints.cms.sections.byId(sectionId)
  );
  return response.data;
};

// Media API
const fetchMedia = async (params: MediaListParams = {}): Promise<MediaListResponse> => {
  const response = await axiosInstance.get<MediaListResponse>(endpoints.cms.media.list, {
    params,
  });
  return response.data;
};

const fetchMediaItem = async (mediaId: string): Promise<MediaResponse> => {
  const response = await axiosInstance.get<MediaResponse>(endpoints.cms.media.byId(mediaId));
  return response.data;
};

// Navigation API
const fetchNavigation = async (location: NavigationLocation): Promise<NavigationResponse> => {
  const response = await axiosInstance.get<NavigationResponse>(
    endpoints.cms.navigation.byLocation(location)
  );
  return response.data;
};

// Settings API
const fetchSettings = async (): Promise<SettingsResponse> => {
  const response = await axiosInstance.get<SettingsResponse>(endpoints.cms.settings);
  return response.data;
};

// ----------------------------------------------------------------------
// PAGES HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch all pages with optional filtering
 * @param {PagesListParams} params - Query parameters (status, search, page, limit)
 * @param {UseQueryOptions} options - React Query options
 */
export function usePages(
  params: PagesListParams = {},
  options?: Omit<UseQueryOptions<PagesListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.pagesList(params),
    queryFn: () => fetchPages(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    ...options,
  });
}

/**
 * Hook to fetch a single page by ID (for admin)
 * @param {string} pageId - Page ID
 * @param {UseQueryOptions} options - React Query options
 */
export function usePage(
  pageId: string,
  options?: Omit<UseQueryOptions<PageResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.page(pageId),
    queryFn: () => fetchPage(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single page by slug (for public pages)
 * @param {string} slug - Page slug
 * @param {UseQueryOptions} options - React Query options
 */
export function usePageBySlug(
  slug: string,
  options?: Omit<UseQueryOptions<PageResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.pageBySlug(slug),
    queryFn: () => fetchPageBySlug(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes (longer for public pages)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Hook to fetch page versions
 * @param {string} pageId - Page ID
 * @param {UseQueryOptions} options - React Query options
 */
export function usePageVersions(
  pageId: string,
  options?: Omit<UseQueryOptions<PageVersionsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.pageVersions(pageId),
    queryFn: () => fetchPageVersions(pageId),
    enabled: !!pageId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ----------------------------------------------------------------------
// SECTIONS HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch sections for a page
 * @param {string} pageId - Page ID
 * @param {UseQueryOptions} options - React Query options
 */
export function useSections(
  pageId: string,
  options?: Omit<UseQueryOptions<SectionsListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.sectionsList(pageId),
    queryFn: () => fetchSections(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single section
 * @param {string} sectionId - Section ID
 * @param {UseQueryOptions} options - React Query options
 */
export function useSection(
  sectionId: string,
  options?: Omit<UseQueryOptions<SectionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.section(sectionId),
    queryFn: () => fetchSection(sectionId),
    enabled: !!sectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ----------------------------------------------------------------------
// MEDIA HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch media library with optional filtering
 * @param {MediaListParams} params - Query parameters (folder, mimeType, search, page, limit)
 * @param {UseQueryOptions} options - React Query options
 */
export function useMedia(
  params: MediaListParams = {},
  options?: Omit<UseQueryOptions<MediaListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.mediaList(params),
    queryFn: () => fetchMedia(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single media item
 * @param {string} mediaId - Media ID
 * @param {UseQueryOptions} options - React Query options
 */
export function useMediaItem(
  mediaId: string,
  options?: Omit<UseQueryOptions<MediaResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.mediaItem(mediaId),
    queryFn: () => fetchMediaItem(mediaId),
    enabled: !!mediaId,
    staleTime: 10 * 60 * 1000, // 10 minutes (media rarely changes)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// ----------------------------------------------------------------------
// NAVIGATION HOOKS
// ----------------------------------------------------------------------

/**
 * Hook to fetch navigation menu by location
 * @param {NavigationLocation} location - Menu location (header, footer, sidebar, mobile)
 * @param {UseQueryOptions} options - React Query options
 */
export function useNavigation(
  location: NavigationLocation,
  options?: Omit<UseQueryOptions<NavigationResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.navigationByLocation(location),
    queryFn: () => fetchNavigation(location),
    enabled: !!location,
    staleTime: 15 * 60 * 1000, // 15 minutes (navigation rarely changes)
    gcTime: 60 * 60 * 1000, // 1 hour
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
 * @param {UseQueryOptions} options - React Query options
 */
export function useSettings(
  options?: Omit<UseQueryOptions<SettingsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: cmsKeys.settings(),
    queryFn: fetchSettings,
    staleTime: 15 * 60 * 1000, // 15 minutes (settings rarely change)
    gcTime: 60 * 60 * 1000, // 1 hour
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
    invalidateAll: () => queryClient.invalidateQueries({queryKey: cmsKeys.all}),
    invalidatePages: () => queryClient.invalidateQueries({queryKey: cmsKeys.pages()}),
    invalidatePage: (id: string) => queryClient.invalidateQueries({queryKey: cmsKeys.page(id)}),
    invalidateSections: () => queryClient.invalidateQueries({queryKey: cmsKeys.sections()}),
    invalidateMedia: () => queryClient.invalidateQueries({queryKey: cmsKeys.media()}),
    invalidateNavigation: () => queryClient.invalidateQueries({queryKey: cmsKeys.navigation()}),
    invalidateSettings: () => queryClient.invalidateQueries({queryKey: cmsKeys.settings()}),
  };
}
