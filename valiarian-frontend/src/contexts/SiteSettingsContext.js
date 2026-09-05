import PropTypes from 'prop-types';
import { createContext, useContext, useMemo } from 'react';
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

  const value = useMemo(
    () => ({
      settings: settings ? {
        general: {
          siteName: settings.siteName,
          siteDescription: settings.siteDescription,
          logo: settings.logo,
          favicon: settings.favicon,
          contactEmail: settings.contactEmail,
          contactPhone: settings.contactPhone,
        },
        seo: {
          defaultTitle: settings.seoTitle || settings.siteName,
          defaultDescription: settings.seoDescription || settings.siteDescription,
          defaultKeywords: settings.seoKeywords,
          ogImage: settings.ogImage,
        },
        socialMedia: settings.socialMedia || {},
        analytics: {
          gtmId: settings.gtmId,
          gaId: settings.gaId,
        },
        contactPage: {
          heroBadge: settings.contactPage?.heroBadge,
          heroTitleLine1: settings.contactPage?.heroTitleLine1,
          heroTitleLine2: settings.contactPage?.heroTitleLine2,
          heroTitleLine3: settings.contactPage?.heroTitleLine3,
          heroImage: settings.contactPage?.heroImage,
          formTitle: settings.contactPage?.formTitle,
          formDescription: settings.contactPage?.formDescription,
          submitLabel: settings.contactPage?.submitLabel,
          mapTitle: settings.contactPage?.mapTitle,
          mapDescription: settings.contactPage?.mapDescription,
          mapEmbedUrl: settings.contactPage?.mapEmbedUrl,
          locations: settings.contactPage?.locations || [],
        },
        legalDocuments: {
          termsAndConditionsUrl: settings.legalDocuments?.termsAndConditionsUrl || '',
          privacyPolicyUrl: settings.legalDocuments?.privacyPolicyUrl || '',
        },
        header: {
          categoryMegaMenuPlaceholderImage:
            settings.header?.categoryMegaMenuPlaceholderImage || '',
        },
        footerText: settings.footerText,
        copyrightText: settings.copyrightText,
      } : getDefaultSettings(),
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

function getDefaultSettings() {
  return {
    general: {
      siteName: 'Valiarian',
      siteDescription:
        "Discover Valiarian's premium clothing, crafted with refined design, exceptional comfort, and timeless style for the modern wardrobe.",
      logo: '/logo/footer-logo.png',
      favicon: '/favicon/favicon.ico',
      contactEmail: 'support@valiarian.com',
      contactPhone: '',
    },
    seo: {
      defaultTitle: 'Valiarian | Premium Clothing',
      defaultDescription:
        "Discover Valiarian's premium clothing, crafted with refined design, exceptional comfort, and timeless style for the modern wardrobe.",
      defaultKeywords: 'fashion, premium, clothing, e-commerce',
      ogImage: '/assets/images/social/valiarian-share-preview.jpeg',
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
    contactPage: {
      heroBadge: 'Where',
      heroTitleLine1: 'to',
      heroTitleLine2: 'find',
      heroTitleLine3: 'us?',
      heroImage: '/assets/images/contact/hero.jpg',
      formTitle: 'Feel free to contact us.',
      formDescription: "We'll be glad to hear from you, buddy.",
      submitLabel: 'Submit Now',
      mapTitle: 'Visit our office',
      mapDescription: 'Find us on the map or reach out directly using the form.',
      mapEmbedUrl: '',
      locations: [
        {
          title: 'Head Office',
          address: '508 Bridle Avenue Newnan, GA 30263',
          phoneNumber: '(239) 555-0108',
          latitude: 33,
          longitude: 65,
        },
        {
          title: 'Studio',
          address: '14 Fashion Street, London, UK',
          phoneNumber: '(319) 555-0115',
          latitude: -12.5,
          longitude: 18.5,
        },
      ],
    },
    legalDocuments: {
      termsAndConditionsUrl: '',
      privacyPolicyUrl: '',
    },
    header: {
      categoryMegaMenuPlaceholderImage: '',
    },
  };
}
