# React Query CMS Hooks - Usage Examples

This document provides examples of how to use the React Query hooks for CMS data fetching.

## Table of Contents
- [Setup](#setup)
- [Pages Hooks](#pages-hooks)
- [Sections Hooks](#sections-hooks)
- [Media Hooks](#media-hooks)
- [Navigation Hooks](#navigation-hooks)
- [Settings Hooks](#settings-hooks)
- [Cache Invalidation](#cache-invalidation)

## Setup

The QueryProvider is already configured in `App.js`. All hooks are ready to use throughout the application.

```javascript
import { usePages, usePage, usePageBySlug } from 'src/api/cms-query';
```

## Pages Hooks

### usePages - Fetch all pages with filtering

```javascript
import { usePages } from 'src/api/cms-query';

function PagesList() {
  const { data, isLoading, error, refetch } = usePages({
    status: 'published',
    search: 'home',
    page: 1,
    limit: 10
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.pages?.map(page => (
        <div key={page.id}>{page.title}</div>
      ))}
    </div>
  );
}
```

### usePage - Fetch single page by ID

```javascript
import { usePage } from 'src/api/cms-query';

function PageEditor({ pageId }) {
  const { data, isLoading, error } = usePage(pageId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data?.page?.title}</h1>
      <p>{data?.page?.description}</p>
    </div>
  );
}
```

### usePageBySlug - Fetch page by slug (public pages)

```javascript
import { usePageBySlug } from 'src/api/cms-query';

function DynamicPage({ slug }) {
  const { data, isLoading, error } = usePageBySlug(slug);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data?.page?.title}</h1>
      {/* Render sections */}
    </div>
  );
}
```

### usePageVersions - Fetch page version history

```javascript
import { usePageVersions } from 'src/api/cms-query';

function VersionHistory({ pageId }) {
  const { data, isLoading, error } = usePageVersions(pageId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.versions?.map(version => (
        <div key={version.id}>
          Version {version.version} - {version.createdAt}
        </div>
      ))}
    </div>
  );
}
```

## Sections Hooks

### useSections - Fetch sections for a page

```javascript
import { useSections } from 'src/api/cms-query';

function SectionsList({ pageId }) {
  const { data, isLoading, error } = useSections(pageId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.sections?.map(section => (
        <div key={section.id}>
          {section.type} - {section.name}
        </div>
      ))}
    </div>
  );
}
```

### useSection - Fetch single section

```javascript
import { useSection } from 'src/api/cms-query';

function SectionEditor({ sectionId }) {
  const { data, isLoading, error } = useSection(sectionId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>{data?.section?.name}</h2>
      {/* Render section editor */}
    </div>
  );
}
```

## Media Hooks

### useMedia - Fetch media library with filtering

```javascript
import { useMedia } from 'src/api/cms-query';

function MediaLibrary() {
  const { data, isLoading, error } = useMedia({
    folder: 'images',
    mimeType: 'image/jpeg',
    search: 'logo',
    page: 1,
    limit: 20
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Total: {data?.totalCount}</p>
      {data?.media?.map(item => (
        <img key={item.id} src={item.thumbnailUrl} alt={item.altText} />
      ))}
    </div>
  );
}
```

### useMediaItem - Fetch single media item

```javascript
import { useMediaItem } from 'src/api/cms-query';

function MediaDetails({ mediaId }) {
  const { data, isLoading, error } = useMediaItem(mediaId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <img src={data?.media?.url} alt={data?.media?.altText} />
      <p>{data?.media?.caption}</p>
    </div>
  );
}
```

## Navigation Hooks

### useNavigation - Fetch navigation menu by location

```javascript
import { useNavigation } from 'src/api/cms-query';

function Header() {
  const { data, isLoading, error } = useNavigation('header');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <nav>
      {data?.navigation?.items?.map(item => (
        <a key={item.id} href={item.url}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
```

## Settings Hooks

### useSettings - Fetch site settings

```javascript
import { useSettings } from 'src/api/cms-query';

function Footer() {
  const { data, isLoading, error } = useSettings();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <footer>
      <p>{data?.settings?.copyrightText}</p>
      <a href={data?.settings?.socialMedia?.facebook}>Facebook</a>
    </footer>
  );
}
```

## Cache Invalidation

### useInvalidateCMS - Invalidate cached data

```javascript
import { useInvalidateCMS } from 'src/api/cms-query';

function PageActions({ pageId }) {
  const invalidate = useInvalidateCMS();

  const handlePublish = async () => {
    // Publish page...

    // Invalidate cache
    invalidate.invalidatePage(pageId);
    invalidate.invalidatePages();
  };

  const handleUpdate = async () => {
    // Update page...

    // Invalidate all CMS cache
    invalidate.invalidateAll();
  };

  return (
    <div>
      <button onClick={handlePublish}>Publish</button>
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
}
```

## Advanced Usage

### Custom Query Options

All hooks accept React Query options as a second parameter:

```javascript
const { data } = usePages(
  { status: 'published' },
  {
    staleTime: 10 * 60 * 1000, // Override default stale time
    enabled: someCondition, // Conditionally enable query
    onSuccess: (data) => {
      console.log('Data loaded:', data);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  }
);
```

### Dependent Queries

```javascript
function PageWithSections({ slug }) {
  // First fetch the page
  const { data: pageData } = usePageBySlug(slug);

  // Then fetch sections (only when page is loaded)
  const { data: sectionsData } = useSections(
    pageData?.page?.id,
    {
      enabled: !!pageData?.page?.id, // Only run when pageId exists
    }
  );

  return (
    <div>
      <h1>{pageData?.page?.title}</h1>
      {sectionsData?.sections?.map(section => (
        <div key={section.id}>{section.name}</div>
      ))}
    </div>
  );
}
```

### Prefetching Data

```javascript
import { useQueryClient } from '@tanstack/react-query';
import { cmsKeys } from 'src/api/cms-query';

function PageLink({ slug }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch page data on hover
    queryClient.prefetchQuery({
      queryKey: cmsKeys.pageBySlug(slug),
      queryFn: () => fetchPageBySlug(slug),
    });
  };

  return (
    <a href={`/page/${slug}`} onMouseEnter={handleMouseEnter}>
      View Page
    </a>
  );
}
```

## Cache Configuration

The default cache settings are:

- **Stale Time**: 5 minutes (data is considered fresh for 5 minutes)
- **Cache Time**: 10 minutes (data stays in cache for 10 minutes after becoming unused)
- **Retry**: 1 attempt for queries, 0 for mutations
- **Refetch on Window Focus**: Disabled by default
- **Refetch on Reconnect**: Enabled

These can be overridden per-hook or globally in `query-provider.js`.

## Best Practices

1. **Use the enabled option** for conditional queries
2. **Invalidate cache** after mutations to keep data fresh
3. **Use prefetching** for better UX on predictable navigation
4. **Handle loading and error states** in all components
5. **Use React Query DevTools** in development for debugging
6. **Keep query keys consistent** using the exported `cmsKeys` object
