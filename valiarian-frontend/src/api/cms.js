import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------
// PAGES
// ----------------------------------------------------------------------

/**
 * Hook to fetch all pages with optional filtering
 * @param {Object} params - Query parameters (status, search, page, limit)
 */
export function useGetPages(params = {}) {
  const URL = params ? [endpoints.cms.pages.list, { params }] : endpoints.cms.pages.list;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      pages: data?.pages || [],
      pagesLoading: isLoading,
      pagesError: error,
      pagesValidating: isValidating,
      pagesEmpty: !isLoading && !data?.pages.length,
      pagesRefresh: mutate,
    }),
    [data?.pages, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

/**
 * Hook to fetch a single page by slug (for public pages)
 * @param {string} slug - Page slug
 */
export function useGetPageBySlug(slug) {
  const URL = slug ? endpoints.cms.pages.bySlug(slug) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      page: data?.page,
      pageLoading: isLoading,
      pageError: error,
      pageValidating: isValidating,
      pageRefresh: mutate,
    }),
    [data?.page, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

/**
 * Hook to fetch a single page by ID (for admin)
 * @param {string} pageId - Page ID
 */
export function useGetPage(pageId) {
  const URL = pageId ? endpoints.cms.pages.byId(pageId) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      page: data?.page,
      pageLoading: isLoading,
      pageError: error,
      pageValidating: isValidating,
      pageRefresh: mutate,
    }),
    [data?.page, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

/**
 * Hook to fetch page versions
 * @param {string} pageId - Page ID
 */
export function useGetPageVersions(pageId) {
  const URL = pageId ? endpoints.cms.pages.versions(pageId) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      versions: data?.versions || [],
      versionsLoading: isLoading,
      versionsError: error,
      versionsValidating: isValidating,
      versionsEmpty: !isLoading && !data?.versions.length,
      versionsRefresh: mutate,
    }),
    [data?.versions, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// SECTIONS
// ----------------------------------------------------------------------

/**
 * Hook to fetch sections for a page
 * @param {string} pageId - Page ID
 */
export function useGetSections(pageId) {
  const URL = pageId ? [endpoints.cms.sections.list, { params: { pageId } }] : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      sections: data?.sections || [],
      sectionsLoading: isLoading,
      sectionsError: error,
      sectionsValidating: isValidating,
      sectionsEmpty: !isLoading && !data?.sections.length,
      sectionsRefresh: mutate,
    }),
    [data?.sections, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

/**
 * Hook to fetch a single section
 * @param {string} sectionId - Section ID
 */
export function useGetSection(sectionId) {
  const URL = sectionId ? endpoints.cms.sections.byId(sectionId) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      section: data?.section,
      sectionLoading: isLoading,
      sectionError: error,
      sectionValidating: isValidating,
      sectionRefresh: mutate,
    }),
    [data?.section, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// MEDIA
// ----------------------------------------------------------------------

/**
 * Hook to fetch media library with optional filtering
 * @param {Object} params - Query parameters (folder, mimeType, search, page, limit)
 */
export function useGetMedia(params = {}) {
  const URL = params ? [endpoints.cms.media.list, { params }] : endpoints.cms.media.list;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      media: data?.media || [],
      mediaLoading: isLoading,
      mediaError: error,
      mediaValidating: isValidating,
      mediaEmpty: !isLoading && !data?.media.length,
      mediaRefresh: mutate,
      totalCount: data?.totalCount || 0,
    }),
    [data?.media, data?.totalCount, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

/**
 * Hook to fetch a single media item
 * @param {string} mediaId - Media ID
 */
export function useGetMediaItem(mediaId) {
  const URL = mediaId ? endpoints.cms.media.byId(mediaId) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      mediaItem: data?.media,
      mediaItemLoading: isLoading,
      mediaItemError: error,
      mediaItemValidating: isValidating,
      mediaItemRefresh: mutate,
    }),
    [data?.media, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// NAVIGATION
// ----------------------------------------------------------------------

/**
 * Hook to fetch navigation menu by location
 * @param {string} location - Menu location (header, footer, sidebar, mobile)
 */
export function useGetNavigation(location) {
  const URL = location ? endpoints.cms.navigation.byLocation(location) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const memoizedValue = useMemo(
    () => ({
      navigation: data?.navigation,
      navigationLoading: isLoading,
      navigationError: error,
      navigationValidating: isValidating,
      navigationRefresh: mutate,
    }),
    [data?.navigation, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// SETTINGS
// ----------------------------------------------------------------------

/**
 * Hook to fetch site settings
 */
export function useGetSettings() {
  const URL = endpoints.cms.settings;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const memoizedValue = useMemo(
    () => ({
      settings: data?.settings,
      settingsLoading: isLoading,
      settingsError: error,
      settingsValidating: isValidating,
      settingsRefresh: mutate,
    }),
    [data?.settings, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}
