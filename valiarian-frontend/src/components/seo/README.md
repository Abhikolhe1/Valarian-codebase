# SEO Components

This directory contains components and utilities for managing SEO metadata, Open Graph tags, Twitter Cards, and structured data.

## Components

### PageSEO

The `PageSEO` component manages all SEO-related meta tags for a page using `react-helmet-async`.

#### Features

- **Meta Tags**: Title, description, keywords, robots
- **Open Graph**: Full OG tag support for social sharing
- **Twitter Cards**: Twitter-specific meta tags
- **Structured Data**: JSON-LD schema.org markup
- **Canonical URLs**: Prevent duplicate content issues
- **Robots Control**: noindex/nofollow support

#### Usage

```jsx
import { PageSEO } from 'src/components/seo';

function MyPage() {
  return (
    <>
      <PageSEO
        title="About Us | Company Name"
        description="Learn more about our company and mission"
        keywords={['company', 'about', 'team', 'mission']}
        ogImage="https://example.com/og-image.jpg"
        ogImageAlt="Company team photo"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Company Name"
        }}
      />

      {/* Page content */}
    </>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Page title (appears in browser tab and search results) |
| `description` | `string` | - | Page description (appears in search results) |
| `keywords` | `string[]` or `string` | `[]` | SEO keywords |
| `ogImage` | `string` | - | Open Graph image URL (1200x630 recommended) |
| `ogImageAlt` | `string` | - | Alt text for OG image |
| `ogType` | `string` | `'website'` | Open Graph type (website, article, etc.) |
| `twitterCard` | `string` | `'summary_large_image'` | Twitter card type |
| `canonicalUrl` | `string` | current URL | Canonical URL for the page |
| `structuredData` | `object` | - | JSON-LD structured data |
| `noIndex` | `boolean` | `false` | Prevent search engine indexing |
| `noFollow` | `boolean` | `false` | Prevent following links on page |

#### Integration with CMS

The `DynamicPage` component automatically uses `PageSEO` with data from the CMS:

```jsx
<PageSEO
  title={page.seoTitle || page.title}
  description={page.seoDescription || page.description}
  keywords={page.seoKeywords}
  ogImage={page.ogImage}
  ogImageAlt={page.ogImageAlt}
  structuredData={page.structuredData}
/>
```

## Utility Functions

Located in `src/utils/seo.js`:

### generateOrganizationSchema(settings)

Generates Organization structured data from site settings.

```jsx
import { generateOrganizationSchema } from 'src/utils/seo';

const schema = generateOrganizationSchema({
  siteName: 'Company Name',
  siteDescription: 'Company description',
  logo: 'https://example.com/logo.png',
  contactEmail: 'contact@example.com',
  socialMedia: {
    facebook: 'https://facebook.com/company',
    twitter: 'https://twitter.com/company'
  }
});
```

### generateWebPageSchema(page, settings)

Generates WebPage structured data from page and settings.

```jsx
import { generateWebPageSchema } from 'src/utils/seo';

const schema = generateWebPageSchema(page, settings);
```

### generateArticleSchema(page, settings)

Generates Article structured data (for blog posts, news articles).

```jsx
import { generateArticleSchema } from 'src/utils/seo';

const schema = generateArticleSchema(page, settings);
```

### generateBreadcrumbSchema(breadcrumbs)

Generates BreadcrumbList structured data.

```jsx
import { generateBreadcrumbSchema } from 'src/utils/seo';

const schema = generateBreadcrumbSchema([
  { name: 'Home', url: 'https://example.com' },
  { name: 'Products', url: 'https://example.com/products' },
  { name: 'Product Name', url: 'https://example.com/products/item' }
]);
```

### mergeSchemas(...schemas)

Combines multiple schemas into a single JSON-LD graph.

```jsx
import { mergeSchemas, generateOrganizationSchema, generateWebPageSchema } from 'src/utils/seo';

const combinedSchema = mergeSchemas(
  generateOrganizationSchema(settings),
  generateWebPageSchema(page, settings)
);
```

### formatPageTitle(pageTitle, siteName)

Formats page title with site name.

```jsx
import { formatPageTitle } from 'src/utils/seo';

const title = formatPageTitle('About Us', 'Company Name');
// Returns: "About Us | Company Name"
```

### truncateDescription(description, maxLength)

Truncates description to optimal SEO length (default: 160 characters).

```jsx
import { truncateDescription } from 'src/utils/seo';

const shortDesc = truncateDescription(longDescription, 160);
```

### extractKeywords(text, maxKeywords)

Extracts keywords from text content.

```jsx
import { extractKeywords } from 'src/utils/seo';

const keywords = extractKeywords(pageContent, 10);
```

## Best Practices

### Title Tags
- Keep under 60 characters
- Include primary keyword
- Make it unique for each page
- Format: "Page Title | Site Name"

### Meta Descriptions
- Keep between 150-160 characters
- Include call-to-action
- Make it compelling and unique
- Include primary keyword naturally

### Keywords
- Use 5-10 relevant keywords
- Focus on long-tail keywords
- Don't keyword stuff
- Use natural language

### Open Graph Images
- Recommended size: 1200x630 pixels
- Use high-quality images
- Include text overlay if needed
- Test on social media platforms

### Structured Data
- Use appropriate schema types
- Validate with Google's Rich Results Test
- Include all required properties
- Keep data accurate and up-to-date

### Canonical URLs
- Always set for duplicate content
- Use absolute URLs
- Point to the preferred version
- Be consistent across pages

## Testing

### Manual Testing

1. **View Source**: Check meta tags in page source
2. **Social Media**: Test sharing on Facebook, Twitter, LinkedIn
3. **Google Rich Results**: Use [Google's Rich Results Test](https://search.google.com/test/rich-results)
4. **Facebook Debugger**: Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
5. **Twitter Validator**: Use [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### Automated Testing

Run tests:
```bash
npm test PageSEO.test.js
```

## Common Issues

### Meta Tags Not Updating

If meta tags aren't updating when navigating between pages:
- Ensure `HelmetProvider` wraps your app
- Check that `PageSEO` is rendered on each page
- Clear browser cache

### Social Media Not Showing Correct Image

- Verify image URL is absolute (not relative)
- Check image dimensions (1200x630 recommended)
- Clear social media cache (Facebook Debugger, Twitter Validator)
- Ensure image is publicly accessible

### Structured Data Errors

- Validate with Google's Rich Results Test
- Check for required properties
- Ensure proper JSON-LD format
- Verify schema.org types are correct

## Resources

- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org Documentation](https://schema.org/)
- [react-helmet-async Documentation](https://github.com/staylor/react-helmet-async)
