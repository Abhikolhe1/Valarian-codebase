import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

// ----------------------------------------------------------------------

/**
 * PageSEO Component
 * Manages SEO meta tags, Open Graph tags, Twitter Cards, and structured data
 *
 * @component
 * @example
 * ```jsx
 * <PageSEO
 *   title="About Us"
 *   description="Learn more about our company"
 *   keywords={['company', 'about', 'team']}
 *   ogImage="https://example.com/og-image.jpg"
 *   structuredData={{
 *     "@context": "https://schema.org",
 *     "@type": "Organization",
 *     "name": "Company Name"
 *   }}
 * />
 * ```
 */
export default function PageSEO({
  title,
  description,
  keywords = [],
  ogImage,
  ogImageAlt,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  canonicalUrl,
  structuredData,
  noIndex = false,
  noFollow = false,
}) {
  // Get current URL if canonical not provided
  const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');

  // Format keywords
  const keywordsString = Array.isArray(keywords) ? keywords.join(', ') : keywords;

  // Robots meta tag
  const robotsContent = [
    noIndex ? 'noindex' : 'index',
    noFollow ? 'nofollow' : 'follow',
  ].join(', ');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      {title && <title>{title}</title>}
      {title && <meta name="title" content={title} />}
      {description && <meta name="description" content={description} />}
      {keywordsString && <meta name="keywords" content={keywordsString} />}
      <meta name="robots" content={robotsContent} />

      {/* Canonical URL */}
      {currentUrl && <link rel="canonical" href={currentUrl} />}

      {/* Open Graph Tags */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
      {ogImage && <meta property="og:image:width" content="1200" />}
      {ogImage && <meta property="og:image:height" content="630" />}

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {ogImage && ogImageAlt && <meta name="twitter:image:alt" content={ogImageAlt} />}

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

PageSEO.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]),
  ogImage: PropTypes.string,
  ogImageAlt: PropTypes.string,
  ogType: PropTypes.string,
  twitterCard: PropTypes.oneOf([
    'summary',
    'summary_large_image',
    'app',
    'player',
  ]),
  canonicalUrl: PropTypes.string,
  structuredData: PropTypes.object,
  noIndex: PropTypes.bool,
  noFollow: PropTypes.bool,
};
