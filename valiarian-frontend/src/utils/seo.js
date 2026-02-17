/**
 * SEO Utility Functions
 * Helper functions for generating structured data and SEO metadata
 */

/**
 * Generate Organization structured data
 * @param {Object} settings - Site settings from CMS
 * @returns {Object} JSON-LD structured data
 */
export function generateOrganizationSchema(settings) {
  if (!settings) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName,
    description: settings.siteDescription,
    url: typeof window !== 'undefined' ? window.location.origin : '',
  };

  if (settings.logo) {
    schema.logo = settings.logo;
  }

  if (settings.contactEmail) {
    schema.email = settings.contactEmail;
  }

  if (settings.contactPhone) {
    schema.telephone = settings.contactPhone;
  }

  if (settings.socialMedia) {
    const socialLinks = [];
    const { facebook, instagram, twitter, linkedin, youtube, pinterest } = settings.socialMedia;

    if (facebook) socialLinks.push(facebook);
    if (instagram) socialLinks.push(instagram);
    if (twitter) socialLinks.push(twitter);
    if (linkedin) socialLinks.push(linkedin);
    if (youtube) socialLinks.push(youtube);
    if (pinterest) socialLinks.push(pinterest);

    if (socialLinks.length > 0) {
      schema.sameAs = socialLinks;
    }
  }

  return schema;
}

/**
 * Generate WebPage structured data
 * @param {Object} page - Page data from CMS
 * @param {Object} settings - Site settings from CMS
 * @returns {Object} JSON-LD structured data
 */
export function generateWebPageSchema(page, settings) {
  if (!page) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.seoTitle || page.title,
    description: page.seoDescription || page.description,
    url: typeof window !== 'undefined' ? window.location.href : '',
  };

  if (page.ogImage) {
    schema.image = page.ogImage;
  }

  if (page.publishedAt) {
    schema.datePublished = new Date(page.publishedAt).toISOString();
  }

  if (page.updatedAt) {
    schema.dateModified = new Date(page.updatedAt).toISOString();
  }

  if (settings?.siteName) {
    schema.publisher = {
      '@type': 'Organization',
      name: settings.siteName,
    };

    if (settings.logo) {
      schema.publisher.logo = {
        '@type': 'ImageObject',
        url: settings.logo,
      };
    }
  }

  return schema;
}

/**
 * Generate BreadcrumbList structured data
 * @param {Array} breadcrumbs - Array of breadcrumb items
 * @returns {Object} JSON-LD structured data
 */
export function generateBreadcrumbSchema(breadcrumbs) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Article structured data
 * @param {Object} page - Page data from CMS
 * @param {Object} settings - Site settings from CMS
 * @returns {Object} JSON-LD structured data
 */
export function generateArticleSchema(page, settings) {
  if (!page) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.seoTitle || page.title,
    description: page.seoDescription || page.description,
    url: typeof window !== 'undefined' ? window.location.href : '',
  };

  if (page.ogImage) {
    schema.image = page.ogImage;
  }

  if (page.publishedAt) {
    schema.datePublished = new Date(page.publishedAt).toISOString();
  }

  if (page.updatedAt) {
    schema.dateModified = new Date(page.updatedAt).toISOString();
  }

  if (page.createdBy) {
    schema.author = {
      '@type': 'Person',
      name: page.createdBy,
    };
  }

  if (settings?.siteName) {
    schema.publisher = {
      '@type': 'Organization',
      name: settings.siteName,
    };

    if (settings.logo) {
      schema.publisher.logo = {
        '@type': 'ImageObject',
        url: settings.logo,
      };
    }
  }

  return schema;
}

/**
 * Merge multiple structured data schemas
 * @param {Array} schemas - Array of schema objects
 * @returns {Object} Combined JSON-LD structured data
 */
export function mergeSchemas(...schemas) {
  const validSchemas = schemas.filter(Boolean);

  if (validSchemas.length === 0) return null;
  if (validSchemas.length === 1) return validSchemas[0];

  return {
    '@context': 'https://schema.org',
    '@graph': validSchemas,
  };
}

/**
 * Generate default page title with site name
 * @param {string} pageTitle - Page title
 * @param {string} siteName - Site name from settings
 * @returns {string} Formatted page title
 */
export function formatPageTitle(pageTitle, siteName) {
  if (!pageTitle) return siteName || '';
  if (!siteName) return pageTitle;
  return `${pageTitle} | ${siteName}`;
}

/**
 * Truncate description to optimal length for SEO
 * @param {string} description - Description text
 * @param {number} maxLength - Maximum length (default: 160)
 * @returns {string} Truncated description
 */
export function truncateDescription(description, maxLength = 160) {
  if (!description) return '';
  if (description.length <= maxLength) return description;

  const truncated = description.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  return lastSpace > 0 ? `${truncated.substring(0, lastSpace)}...` : `${truncated}...`;
}

/**
 * Extract keywords from text
 * @param {string} text - Text to extract keywords from
 * @param {number} maxKeywords - Maximum number of keywords (default: 10)
 * @returns {Array} Array of keywords
 */
export function extractKeywords(text, maxKeywords = 10) {
  if (!text) return [];

  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, ' ');

  // Split into words and filter
  const words = cleanText
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3) // Only words longer than 3 characters
    .filter((word) => !/^\d+$/.test(word)); // Exclude pure numbers

  // Count word frequency
  const frequency = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}
