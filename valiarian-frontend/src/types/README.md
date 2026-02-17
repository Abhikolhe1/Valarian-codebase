# CMS TypeScript Types Documentation

This directory contains comprehensive TypeScript type definitions for the CMS system, providing type safety and runtime validation for all CMS-related data structures.

## Overview

The type system is organized into several categories:

1. **Core Models** - Main data entities (Page, Section, Media, etc.)
2. **API Response Types** - Structured responses from API endpoints
3. **API Request Types** - Request payloads for mutations
4. **Type Guards** - Runtime validation functions
5. **Utility Types** - Helper types for common patterns

## Usage Examples

### Basic Usage with Hooks

```typescript
import { useGetPages, useGetPageBySlug } from 'src/api/cms';
import type { Page, PageStatus } from 'src/types/cms';

function PagesList() {
  const { pages, pagesLoading } = useGetPages({ status: 'published' });

  // pages is typed as Page[]
  return (
    <div>
      {pages.map((page: Page) => (
        <div key={page.id}>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Using React Query Hooks

```typescript
import { usePageBySlug } from 'src/api/cms-query';
import type { Page } from 'src/types/cms';

function DynamicPage({ slug }: { slug: string }) {
  const { data, isLoading, error } = usePageBySlug(slug);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading page</div>;

  const page: Page | undefined = data?.page;

  return (
    <div>
      <h1>{page?.title}</h1>
      <p>{page?.description}</p>
    </div>
  );
}
```

### Type Guards for Runtime Validation

```typescript
import { isPage, isSection, isErrorResponse } from 'src/types/cms';

async function fetchPageData(slug: string) {
  const response = await fetch(`/api/cms/pages/${slug}`);
  const data = await response.json();

  // Runtime validation
  if (isErrorResponse(data)) {
    console.error('API Error:', data.error.message);
    return null;
  }

  if (data.page && isPage(data.page)) {
    // TypeScript now knows data.page is a Page
    console.log('Page title:', data.page.title);
    return data.page;
  }

  return null;
}
```

### Typed Section Content

```typescript
import type {
  Section,
  HeroSection,
  HeroSectionContent,
  TypedSection
} from 'src/types/cms';

function HeroSectionRenderer({ section }: { section: Section }) {
  // Cast to typed section for better type safety
  const heroSection = section as TypedSection<HeroSectionContent>;
  const content = heroSection.content;

  return (
    <div>
      <h1>{content.heading}</h1>
      <p>{content.subheading}</p>
      {content.ctaButtons?.map((button, index) => (
        <a key={index} href={button.url}>
          {button.text}
        </a>
      ))}
    </div>
  );
}
```

### Working with Navigation

```typescript
import { useGetNavigation } from 'src/api/cms';
import type { NavigationMenu, MenuItem } from 'src/types/cms';

function Header() {
  const { navigation } = useGetNavigation('header');

  const renderMenuItem = (item: MenuItem) => (
    <a
      href={item.url}
      target={item.openInNewTab ? '_blank' : '_self'}
      rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
    >
      {item.label}
    </a>
  );

  return (
    <nav>
      {navigation?.items?.map((item, index) => (
        <div key={index}>
          {renderMenuItem(item)}
          {item.children?.map((child, childIndex) => (
            <div key={childIndex}>{renderMenuItem(child)}</div>
          ))}
        </div>
      ))}
    </nav>
  );
}
```

### Working with Media

```typescript
import { useGetMedia } from 'src/api/cms';
import type { Media, MediaListParams } from 'src/types/cms';

function MediaGallery() {
  const params: MediaListParams = {
    folder: '/images',
    mimeType: 'image/jpeg',
    page: 1,
    limit: 20,
  };

  const { media, totalCount } = useGetMedia(params);

  return (
    <div>
      <p>Total: {totalCount} images</p>
      {media.map((item: Media) => (
        <img
          key={item.id}
          src={item.thumbnailUrl || item.url}
          alt={item.altText || item.originalName}
          width={item.width}
          height={item.height}
        />
      ))}
    </div>
  );
}
```

### Creating Type-Safe API Requests

```typescript
import axiosInstance from 'src/utils/axios';
import type {
  PageRequest,
  PageResponse,
  SectionRequest,
  SectionResponse
} from 'src/types/cms';

async function createPage(pageData: PageRequest): Promise<PageResponse> {
  const response = await axiosInstance.post<PageResponse>(
    '/api/cms/pages',
    pageData
  );
  return response.data;
}

async function createSection(sectionData: SectionRequest): Promise<SectionResponse> {
  const response = await axiosInstance.post<SectionResponse>(
    '/api/cms/sections',
    sectionData
  );
  return response.data;
}

// Usage
const newPage: PageRequest = {
  slug: 'about-us',
  title: 'About Us',
  description: 'Learn more about our company',
  status: 'draft',
  seoTitle: 'About Us - Company Name',
  seoDescription: 'Discover our story and mission',
};

const result = await createPage(newPage);
console.log('Created page:', result.page.id);
```

### Using Enum Types

```typescript
import type { PageStatus, SectionType, NavigationLocation } from 'src/types/cms';

// Type-safe status values
const validStatuses: PageStatus[] = ['draft', 'published', 'scheduled', 'archived'];

// Type-safe section types
const sectionTypes: SectionType[] = [
  'hero',
  'features',
  'testimonials',
  'gallery',
  'cta',
  'text',
];

// Type-safe navigation locations
const locations: NavigationLocation[] = ['header', 'footer', 'sidebar', 'mobile'];

function getStatusColor(status: PageStatus): string {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'published':
      return 'green';
    case 'scheduled':
      return 'blue';
    case 'archived':
      return 'red';
    default:
      // TypeScript ensures all cases are covered
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
  }
}
```

### Partial Updates

```typescript
import type { PartialPage, PartialSection } from 'src/types/cms';

async function updatePage(pageId: string, updates: PartialPage) {
  // Only send the fields that changed
  const response = await axiosInstance.put(
    `/api/cms/pages/${pageId}`,
    updates
  );
  return response.data;
}

// Usage - only update specific fields
await updatePage('page-123', {
  title: 'New Title',
  status: 'published',
});
```

### Working with Settings

```typescript
import { useGetSettings } from 'src/api/cms';
import type { SiteSettings, SocialMedia } from 'src/types/cms';

function Footer() {
  const { settings } = useGetSettings();

  const socialMedia: SocialMedia | undefined = settings?.socialMedia;

  return (
    <footer>
      <p>{settings?.copyrightText}</p>
      <div>
        {socialMedia?.facebook && (
          <a href={socialMedia.facebook}>Facebook</a>
        )}
        {socialMedia?.instagram && (
          <a href={socialMedia.instagram}>Instagram</a>
        )}
        {socialMedia?.twitter && (
          <a href={socialMedia.twitter}>Twitter</a>
        )}
      </div>
    </footer>
  );
}
```

## Type Guard Reference

All type guards follow the pattern `is[TypeName]` and return a boolean:

- `isPage(value)` - Validates Page objects
- `isSection(value)` - Validates Section objects
- `isMedia(value)` - Validates Media objects
- `isNavigationMenu(value)` - Validates NavigationMenu objects
- `isSiteSettings(value)` - Validates SiteSettings objects
- `isContentVersion(value)` - Validates ContentVersion objects
- `isSectionTemplate(value)` - Validates SectionTemplate objects
- `isErrorResponse(value)` - Validates error responses
- `isPageStatus(value)` - Validates PageStatus enum values
- `isSectionType(value)` - Validates SectionType enum values
- `isNavigationLocation(value)` - Validates NavigationLocation enum values

## Best Practices

1. **Always use type guards for runtime validation** when dealing with external data
2. **Use typed sections** (`TypedSection<T>`) when working with specific section types
3. **Leverage enum types** for status, type, and location fields
4. **Use partial types** for update operations
5. **Import types with `type` keyword** for better tree-shaking: `import type { Page } from 'src/types/cms'`
6. **Validate API responses** before using them in your application
7. **Use the provided hooks** which already have proper typing built-in

## Migration from JavaScript

If you're migrating from JavaScript files:

1. Rename `.js` files to `.ts` or `.tsx`
2. Import types: `import type { Page, Section } from 'src/types/cms'`
3. Add type annotations to function parameters and return values
4. Use type guards for runtime validation
5. Fix any TypeScript errors that appear

## Type Generation

These types are manually maintained to match the backend LoopBack 4 models. When backend models change:

1. Update the corresponding types in `src/types/cms.ts`
2. Update type guards if validation logic changes
3. Update this documentation with new examples
4. Run TypeScript compiler to check for breaking changes

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Query TypeScript Guide](https://tanstack.com/query/latest/docs/react/typescript)
