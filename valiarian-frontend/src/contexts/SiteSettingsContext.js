import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
// Import useSiteSettings from API and alias it to avoid naming conflict with context hook
import { useSiteSettings as useSiteSettingsAPI } from 'src/api/cms-query';

// ----------------------------------------------------------------------

const SiteSettingsContext = createContext(null);

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  }
  return context;
};

// ----------------------------------------------------------------------

SiteSettingsProvider.propTypes = {
  children: PropTypes.node,
};

export function SiteSettingsProvider({ children }) {
  const { settings, settingsLoading: isLoading, settingsError: error } = useSiteSettingsAPI();

  // Inject analytics scripts when settings are loaded
  useEffect(() => {
    if (settings?.analytics) {
      // Inject Google Tag Manager
      if (settings.analytics.gtmId) {
        injectGTM(settings.analytics.gtmId);
      }

      // Inject Google Analytics
      if (settings.analytics.gaId) {
        injectGA(settings.analytics.gaId);
      }
    }
  }, [settings]);

  const value = useMemo(
    () => ({
      settings: settings || getDefaultSettings(),
      isLoading,
      error,
      isFromCMS: !!settings,
    }),
    [settings, isLoading, error]
  );

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <SiteSettingsContext.Provider value={value}>
      {settings && <SiteMetaTags settings={settings} />}
      {children}
    </SiteSettingsContext.Provider>
  );
}

// ----------------------------------------------------------------------

SiteMetaTags.propTypes = {
  settings: PropTypes.object,
};

function SiteMetaTags({ settings }) {
  return (
    <Helmet>
      {/* Favicon */}
      {settings.general?.favicon && <link rel="icon" href={settings.general.favicon} />}

      {/* Default SEO tags */}
      {settings.seo?.defaultTitle && <title>{settings.seo.defaultTitle}</title>}
      {settings.seo?.defaultDescription && (
        <meta name="description" content={settings.seo.defaultDescription} />
      )}
      {settings.seo?.defaultKeywords && (
        <meta name="keywords" content={settings.seo.defaultKeywords} />
      )}

      {/* Open Graph tags */}
      {settings.seo?.ogImage && <meta property="og:image" content={settings.seo.ogImage} />}
      {settings.general?.siteName && (
        <meta property="og:site_name" content={settings.general.siteName} />
      )}

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      {settings.socialMedia?.twitter && (
        <meta name="twitter:site" content={`@${settings.socialMedia.twitter}`} />
      )}
    </Helmet>
  );
}

// ----------------------------------------------------------------------

function injectGTM(gtmId) {
  // Check if GTM is already loaded
  if (window.dataLayer) return;

  // Inject GTM script
  const script = document.createElement('script');
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `;
  document.head.appendChild(script);

  // Inject GTM noscript
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
}

function injectGA(gaId) {
  // Check if GA is already loaded
  if (window.gtag) return;

  // Inject GA script
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

function getDefaultSettings() {
  return {
    general: {
      siteName: 'Valiarian',
      siteDescription: 'Premium Fashion E-commerce',
      logo: '/logo/footer-logo.png',
      favicon: '/favicon/favicon.ico',
      contactEmail: 'support@valiarian.in',
      contactPhone: '',
    },
    seo: {
      defaultTitle: 'Valiarian - Premium Fashion',
      defaultDescription: 'Discover premium fashion at Valiarian',
      defaultKeywords: 'fashion, premium, clothing, e-commerce',
      ogImage: '/assets/images/og-image.jpg',
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      pinterest: '',
    },
    analytics: {
      gtmId: '',
      gaId: '',
    },
  };
}
