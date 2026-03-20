import axios from 'axios';
import useSWR from 'swr';

const API_URL = process.env.REACT_APP_HOST_API || 'http://localhost:3035';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Fetcher function for SWR
const fetcher = (url) => axiosInstance.get(url).then((res) => res.data);

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
  const { data, error, isLoading } = useSWR(
    location ? `/api/cms/navigation/${location}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    data, // Return raw data to match expected structure
    isLoading,
    error,
  };
}

/**
 * Fetch site settings
 * @returns {Object} { settings, loading, error }
 */
export function useSiteSettings() {
  const { data, error, isLoading } = useSWR(
    '/api/cms/settings',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    settings: data,
    settingsLoading: isLoading,
    settingsError: error,
  };
}
