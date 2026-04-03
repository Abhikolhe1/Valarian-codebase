/**
 * Site Settings Loader
 * Fetches site settings from the CMS API and makes them globally available
 * This script runs before React loads to ensure settings are available immediately
 */

(function () {
  'use strict';

  // Default settings fallback
  const DEFAULT_SETTINGS = {
    siteName: 'Valiarian',
    siteDescription: 'Welcome to Valiarian',
    logo: '/logo/logo_full.svg',
    favicon: '/favicon/favicon.ico',
    contactEmail: 'contact@valiarian.com',
    contactPhone: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      pinterest: ''
    },
    footerText: '',
    copyrightText: '© 2024 Valiarian. All rights reserved.',
    gtmId: '',
    gaId: '',
    theme: {
      primary: {
        main: '#00A76F',
        contrastText: '#FFFFFF'
      },
      secondary: {
        main: '#8E33FF',
        contrastText: '#FFFFFF'
      }
    },
    header: {
      categoryMegaMenuPlaceholderImage:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUHOpowQpT8ZqJLNRZ1LIcQlmsAd1aPqugpg&s'
    },
    offers: {
      marquee: [
        { text: 'Flat 20% off on premium polos' },
        { text: 'Free shipping on orders above ₹1999' },
        { text: 'Limited edition drop - Shop now' }
      ]
    }
  };

  // API endpoint
  const API_URL = 'http://localhost:3035/api/cms/settings';

  // Global settings object
  window.siteSettings = DEFAULT_SETTINGS;

  /**
   * Update meta tag
   */
  function updateMetaTag(name, content) {
    if (!content) return;

    let meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  }

  /**
   * Update Open Graph meta tag
   */
  function updateOGTag(property, content) {
    if (!content) return;

    let meta = document.querySelector(`meta[property="${property}"]`);
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  }

  /**
   * Update favicon
   */
  function updateFavicon(faviconUrl) {
    if (!faviconUrl) return;

    // Update all favicon link tags
    const faviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    faviconLinks.forEach(link => {
      link.setAttribute('href', faviconUrl);
    });

    // If no favicon link exists, create one
    if (faviconLinks.length === 0) {
      const link = document.createElement('link');
      link.setAttribute('rel', 'icon');
      link.setAttribute('href', faviconUrl);
      document.head.appendChild(link);
    }
  }

  /**
   * Apply settings to document (title, meta tags, favicon)
   */
  function applySettingsToDocument() {
    const settings = window.siteSettings;

    // Update document title
    if (settings.siteName) {
      document.title = settings.siteName;
    }

    // Update meta description
    if (settings.siteDescription) {
      updateMetaTag('description', settings.siteDescription);
    }

    // Update favicon
    if (settings.favicon) {
      updateFavicon(settings.favicon);
    }

    // Update Open Graph tags for social sharing
    updateOGTag('og:title', settings.siteName);
    updateOGTag('og:description', settings.siteDescription);
    updateOGTag('og:site_name', settings.siteName);
    if (settings.logo) {
      updateOGTag('og:image', settings.logo);
    }

    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', settings.siteName);
    updateMetaTag('twitter:description', settings.siteDescription);
    if (settings.logo) {
      updateMetaTag('twitter:image', settings.logo);
    }

    console.log('✅ Site settings applied:', {
      title: document.title,
      description: settings.siteDescription,
      favicon: settings.favicon
    });
  }

  /**
   * Inject Google Analytics
   */
  function injectGoogleAnalytics(gaId) {
    if (!gaId) return;

    console.log('📊 Injecting Google Analytics:', gaId);

    // Google Analytics 4
    if (gaId.startsWith('G-')) {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(script2);
    }
    // Universal Analytics
    else if (gaId.startsWith('UA-')) {
      const script = document.createElement('script');
      script.innerHTML = `
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
        ga('create', '${gaId}', 'auto');
        ga('send', 'pageview');
      `;
      document.head.appendChild(script);
    }
  }

  /**
   * Inject Google Tag Manager
   */
  function injectGoogleTagManager(gtmId) {
    if (!gtmId) return;

    console.log('📊 Injecting Google Tag Manager:', gtmId);

    // GTM script in head
    const script = document.createElement('script');
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtmId}');
    `;
    document.head.appendChild(script);

    // GTM noscript in body (wait for body to be available)
    const addNoScript = () => {
      const noscript = document.createElement('noscript');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      noscript.appendChild(iframe);
      document.body.insertBefore(noscript, document.body.firstChild);
    };

    if (document.body) {
      addNoScript();
    } else {
      document.addEventListener('DOMContentLoaded', addNoScript);
    }
  }

  /**
   * Inject analytics scripts
   */
  function injectAnalytics() {
    const settings = window.siteSettings;

    // Inject Google Tag Manager first (if available)
    if (settings.gtmId) {
      injectGoogleTagManager(settings.gtmId);
    }

    // Inject Google Analytics (if available and GTM not used)
    if (settings.gaId && !settings.gtmId) {
      injectGoogleAnalytics(settings.gaId);
    }
  }

  /**
   * Fetch site settings from API
   */
  function fetchSiteSettings() {
    console.log('🔄 Fetching site settings from:', API_URL);

    return fetch(API_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(function (data) {
        console.log('✅ Site settings loaded from API:', data);

        // Merge API data with defaults
        window.siteSettings = Object.assign({}, DEFAULT_SETTINGS, data);

        // Apply settings to document
        applySettingsToDocument();

        // Inject analytics scripts if configured
        injectAnalytics();

        // Dispatch custom event to notify React app
        window.dispatchEvent(new CustomEvent('siteSettingsLoaded', {
          detail: window.siteSettings
        }));

        return window.siteSettings;
      })
      .catch(function (error) {
        console.warn('⚠️ Failed to load site settings from API, using defaults:', error?.error?.message);

        // Apply default settings to document
        applySettingsToDocument();

        // Still dispatch event with default settings
        window.dispatchEvent(new CustomEvent('siteSettingsLoaded', {
          detail: window.siteSettings
        }));

        return window.siteSettings;
      });
  }

  /**
   * Get site setting by key
   */
  window.getSiteSetting = function (key, defaultValue) {
    if (!key) return window.siteSettings;

    const keys = key.split('.');
    let value = window.siteSettings;

    for (let i = 0; i < keys.length; i++) {
      if (value && typeof value === 'object' && keys[i] in value) {
        value = value[keys[i]];
      } else {
        return defaultValue !== undefined ? defaultValue : null;
      }
    }

    return value;
  };

  // Fetch settings when script loads
  fetchSiteSettings();

})();
