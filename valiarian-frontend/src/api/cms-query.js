import axios from 'axios';
import useSWR from 'swr';

const API_URL = process.env.REACT_APP_HOST_API || 'http://localhost:3035';
const CMS_NAV_MISSING_PREFIX = 'cms-navigation-missing:';
const CMS_SETTINGS_MISSING_KEY = 'cms-settings-missing';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Fetcher function for SWR
const fetcher = (url) => axiosInstance.get(url).then((res) => res.data);

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function getMissingNavigationKey(location) {
  return `${CMS_NAV_MISSING_PREFIX}${location}`;
}

function isNavigationMarkedMissing(location) {
  return canUseSessionStorage() && window.sessionStorage.getItem(getMissingNavigationKey(location)) === '1';
}

function markNavigationMissing(location) {
  if (canUseSessionStorage()) {
    window.sessionStorage.setItem(getMissingNavigationKey(location), '1');
  }
}

function clearNavigationMissing(location) {
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(getMissingNavigationKey(location));
  }
}

function isSettingsMarkedMissing() {
  return canUseSessionStorage() && window.sessionStorage.getItem(CMS_SETTINGS_MISSING_KEY) === '1';
}

function markSettingsMissing() {
  if (canUseSessionStorage()) {
    window.sessionStorage.setItem(CMS_SETTINGS_MISSING_KEY, '1');
  }
}

function clearSettingsMissing() {
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(CMS_SETTINGS_MISSING_KEY);
  }
}

/**
 * Fetch page by slug with all sections
 * @param {string} slug - Page slug (e.g., 'home', 'about')
 * @returns {Object} { page, sections, loading, error }
 */
export function usePageWithSections(slug) {
  const { data, error, isLoading } = useSWR(
    slug ? `/api/cms/pages/slug/${slug}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    page: data,
    pageLoading: isLoading,
    pageError: error,
  };
}

/**
 * Fetch sections for a specific page by slug
 * @param {string} slug - Page slug (e.g., 'home', 'about')
 * @returns {Object} { sections, loading, error }
 */
export function usePageSectionsBySlug(slug) {
  const { data, error, isLoading } = useSWR(
    slug ? `/api/cms/pages/slug/${slug}/sections` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    sections: data || [],
    sectionsLoading: isLoading,
    sectionsError: error,
  };
}

/**
 * Fetch navigation menu by location
 * @param {string} location - Navigation location (e.g., 'header', 'footer')
 * @returns {Object} { navigation, loading, error }
 */
export function useNavigation(location) {
  const shouldFetch = !!location && !isNavigationMarkedMissing(location);
  const { data, error, isLoading } = useSWR(
    shouldFetch ? `/api/cms/navigation/${location}` : null,
    async (url) => {
      try {
        const response = await fetcher(url);
        clearNavigationMissing(location);
        return response;
      } catch (fetchError) {
        if (fetchError?.response?.status === 404) {
          markNavigationMissing(location);
          return null;
        }
        throw fetchError;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      dedupingInterval: 5 * 60 * 1000,
    }
  );

  return {
    data: data || null, // Return raw data to match expected structure
    isLoading: shouldFetch ? isLoading : false,
    error,
  };
}

/**
 * Fetch site settings
 * @returns {Object} { settings, loading, error }
 */
export function useSiteSettings() {
  const shouldFetch = !isSettingsMarkedMissing();
  const { data, error, isLoading } = useSWR(
    shouldFetch ? '/api/cms/settings' : null,
    async (url) => {
      try {
        const response = await fetcher(url);
        clearSettingsMissing();
        return response;
      } catch (fetchError) {
        if (fetchError?.response?.status === 404) {
          markSettingsMissing();
          return null;
        }
        throw fetchError;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      dedupingInterval: 5 * 60 * 1000,
    }
  );

  return {
    settings: data,
    settingsLoading: shouldFetch ? isLoading : false,
    settingsError: error,
  };
}
