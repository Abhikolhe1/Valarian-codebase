# CMS Dynamic Pages

This directory contains components for rendering dynamic CMS pages in the frontend application.

## Components

### DynamicPage

The `DynamicPage` component fetches and renders a CMS page by slug with all its sections.

#### Features

- **Dynamic Content Loading**: Fetches page data from the CMS API using React Query
- **Section Rendering**: Automatically renders all page sections in the correct order
- **Loading States**: Shows skeleton loaders while content is being fetched
- **Error Handling**: Displays user-friendly error messages for various failure scenarios
- **Status Validation**: Only renders published pages, shows appropriate messages for drafts
- **Error Boundaries**: Catches and handles section rendering errors gracefully
- **Responsive**: Works seamlessly across all device sizes
- **Basic SEO**: Includes title, description, keywords, and Open Graph tags

### DynamicPageWithSEO

Enhanced version of `DynamicPage` with comprehensive SEO optimization.

#### Additional Features

- **Structured Data**: Automatically generates JSON-LD schema.org markup
- **Site Settings Integration**: Fetches and uses site settings for SEO
- **Organization Schema**: Includes organization information in structured data
- **WebPage Schema**: Generates proper WebPage structured data
- **Title Formatting**: Automatically formats titles with site name
- **Canonical URLs**: Sets proper canonical URLs for each page

#### Usage

##### DynamicPage (Basic SEO)

```jsx
import { Route } from 'react-router-dom';
import { DynamicPage } from 'src/pages/cms';

// In your router configuration
<Route path="/page/:slug" element={<DynamicPage />} />
```

##### DynamicPageWithSEO (Enhanced SEO)

```jsx
import { Route } from 'react-router-dom';
import { DynamicPageWithSEO } from 'src/pages/cms';

// In your router configuration - Recommended for production
<Route path="/page/:slug" element={<DynamicPageWithSEO />} />
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `slug` | `string` | No | Page slug to fetch. If not provided, uses slug from URL params |

#### States

##### Loading State
Shows a skeleton loader with:
- Hero section placeholder
- Content section placeholders
- Grid layout placeholders

##### Error States
- **Fetch Error**: Network or API errors
- **Page Not Found**: Slug doesn't exist in CMS
- **Not Published**: Page exists but status is not 'published'
- **No Content**: Page has no sections

##### Success State
Renders all enabled sections in order using the `SectionList` component.

#### Integration with CMS

The component uses the `usePageBySlug` hook from `src/api/cms-query.ts` which:
- Fetches page data with all sections
- Caches responses for 10 minutes
- Automatically refetches on stale data
- Handles loading and error states

#### Section Rendering

Sections are rendered using the `SectionList` component which:
- Sorts sections by their `order` field
- Skips disabled sections (`enabled: false`)
- Wraps each section in an error boundary
- Maps section types to their corresponding components

#### Error Logging

In development mode:
- Shows detailed error messages
- Logs errors to console with context

In production mode:
- Shows generic error messages
- Logs errors with page and section context for debugging

## Example Router Setup

```jsx
import { Routes, Route } from 'react-router-dom';
import { DynamicPage } from 'src/pages/cms';
import HomePage from 'src/pages/home';
import NotFoundPage from 'src/pages/404';

function AppRoutes() {
  return (
    <Routes>
      {/* Static routes */}
      <Route path="/" element={<HomePage />} />

      {/* Dynamic CMS pages */}
      <Route path="/about" element={<DynamicPage slug="about-us" />} />
      <Route path="/contact" element={<DynamicPage slug="contact" />} />
      <Route path="/premium" element={<DynamicPage slug="premium" />} />

      {/* Catch-all dynamic route */}
      <Route path="/page/:slug" element={<DynamicPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

## Testing

Tests are located in `DynamicPage.test.js` and cover:
- Loading states
- Success states with sections
- Error states (fetch errors, not found, unpublished)
- Section ordering
- Disabled sections
- Empty pages

Run tests:
```bash
npm test DynamicPage.test.js
```

## Performance Considerations

### Caching
- Page data is cached for 10 minutes by React Query
- Sections are cached as part of the page response
- No additional API calls needed for sections

### Loading Optimization
- Skeleton loaders prevent layout shift
- Images in sections should use lazy loading
- Consider implementing code splitting for section components

### SEO
- For SEO optimization, use the `DynamicPageWithSEO` wrapper
- This adds meta tags, Open Graph tags, Twitter Cards, and structured data
- Automatically generates WebPage and Organization schemas
- Formats page titles with site name
- Uses site settings for organization information

## SEO Implementation

### Meta Tags

Both `DynamicPage` and `DynamicPageWithSEO` include:
- Title tag (from `seoTitle` or `title`)
- Meta description (from `seoDescription` or `description`)
- Meta keywords (from `seoKeywords`)
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URL

### Structured Data

`DynamicPageWithSEO` automatically generates:
- **WebPage Schema**: Page-level structured data
- **Organization Schema**: Company/organization information
- **Custom Schema**: Uses `page.structuredData` if provided

Example structured data output:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "About Us",
      "description": "Learn about our company",
      "url": "https://example.com/about",
      "image": "https://example.com/og-image.jpg",
      "datePublished": "2024-01-01T00:00:00.000Z",
      "dateModified": "2024-01-15T00:00:00.000Z",
      "publisher": {
        "@type": "Organization",
        "name": "Company Name"
      }
    },
    {
      "@type": "Organization",
      "name": "Company Name",
      "description": "Company description",
      "url": "https://example.com",
      "logo": "https://example.com/logo.png",
      "email": "contact@example.com",
      "sameAs": [
        "https://facebook.com/company",
        "https://twitter.com/company"
      ]
    }
  ]
}
```

### CMS Integration

SEO data comes from the CMS Page model:
- `seoTitle`: Custom title for SEO (falls back to `title`)
- `seoDescription`: Custom description for SEO (falls back to `description`)
- `seoKeywords`: Array of keywords
- `ogImage`: Open Graph image URL
- `ogImageAlt`: Alt text for OG image
- `structuredData`: Custom JSON-LD structured data

### Testing SEO

1. **View Page Source**: Check meta tags in HTML source
2. **Google Rich Results Test**: https://search.google.com/test/rich-results
3. **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
4. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
5. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

## Future Enhancements

- [ ] Preview mode for draft pages (with authentication)
- [ ] A/B testing support
- [ ] Analytics tracking integration
- [ ] Incremental static regeneration support
- [ ] Multi-language support
- [ ] Page transitions and animations
