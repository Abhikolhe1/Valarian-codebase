import { useEffect, useState } from 'react';

/**
 * Hook to access site settings loaded from the CMS
 * Settings are loaded globally via site-settings.js in index.html
 *
 * @returns {Object} Site settings object
 *
 * @example
 * const settings = useSiteSettings();
 * console.log(settings.siteName);
 * console.log(settings.logo);
 * console.log(settings.socialMedia.facebook);
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState(window.siteSettings || {});
  const [loading, setLoading] = useState(!window.siteSettings);

  useEffect(() => {
    // If settings are already loaded, use them
    if (window.siteSettings) {
      setSettings(window.siteSettings);
      setLoading(false);
      return undefined;
    }

    // Listen for settings loaded event
    const handleSettingsLoaded = (event) => {
      setSettings(event.detail);
      setLoading(false);
    };

    window.addEventListener('siteSettingsLoaded', handleSettingsLoaded);

    return () => {
      window.removeEventListener('siteSettingsLoaded', handleSettingsLoaded);
    };
  }, []);

  return { settings, loading };
}

/**
 * Get a specific setting value by key path
 *
 * @param {string} key - Dot-notation path to setting (e.g., 'socialMedia.facebook')
 * @param {any} defaultValue - Default value if setting not found
 * @returns {any} Setting value
 *
 * @example
 * const siteName = useSiteSetting('siteName', 'Default Site');
 * const facebook = useSiteSetting('socialMedia.facebook', '');
 */
export function useSiteSetting(key, defaultValue) {
  const { settings } = useSiteSettings();

  if (!key) return settings;

  const keys = key.split('.');
  const value = settings;

  const resolved = keys.reduce((acc, currentKey) => {
    if (acc && typeof acc === 'object' && currentKey in acc) {
      return acc[currentKey];
    }

    return undefined;
  }, value);

  if (resolved !== undefined) {
    return resolved;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  return null;
}

/**
 * Helper function to get site setting (non-hook version)
 * Can be used outside of React components
 *
 * @param {string} key - Dot-notation path to setting
 * @param {any} defaultValue - Default value if setting not found
 * @returns {any} Setting value
 */
export function getSiteSetting(key, defaultValue) {
  return window.getSiteSetting ? window.getSiteSetting(key, defaultValue) : defaultValue;
}
