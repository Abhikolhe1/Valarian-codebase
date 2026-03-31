# React Query CMS Hooks Implementation

## Overview

This implementation provides React Query hooks for CMS data fetching in the Valiarian frontend application. These hooks offer an alternative to the existing SWR hooks with enhanced caching, prefetching, and state management capabilities.

## Files Created

1. **cms-query.js** - Main hooks file with all CMS data fetching hooks
2. **query-provider.js** - QueryClient provider configuration
3. **cms-query-examples.md** - Comprehensive usage examples and documentation
4. **cms-query-demo.js** - Demo components showing practical usage
5. **README-REACT-QUERY.md** - This file

## Installation

React Query has been installed:
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

## Setup

The QueryProvider has been integrated into `App.js`:

```javascript
import QueryProvider from 'src/api/query-provider';

// In App component
<QueryProvider>
  {/* Rest of app */}
</QueryProvider>
```

## Available Hooks

### Pages
- `usePages(params, options)` - Fetch all pages with filtering
- `usePage(pageId, options)` - Fetch single page by ID
- `usePageBySlug(slug, options)` - Fetch page by slug (public)
- `usePageVersions(pageId, options)` - Fetch page version history

### Sections
- `useSections(pageId, options)` - Fetch sections for a page
- `useSection(sectionId, options)` - Fetch single section

### Media
- `useMedia(params, options)` - Fetch media library with filtering
- `useMediaItem(mediaId, options)` - Fetch single media item

### Navigation
- `useNavigation(location, options)` - Fetch navigation menu by location

### Settings
- `useSettings(options)` - Fetch site settings

### Cache Management
- `useInvalidateCMS()` - Hook for cache invalidation

## Key Features

### 1. Intelligent Caching
- **Stale Time**: Data is considered fresh for 5-15 minutes depending on content type
- **Cache Time**: Data stays in cache for 10-60 minutes after becoming unused
- **Automatic Refetching**: Configurable refetch on reconnect

### 2. Query Keys
Structured query keys for precise cache management:
```javascript
cmsKeys.pagesList(params)
cmsKeys.page(id)
cmsKeys.pageBySlug(slug)
cmsKeys.sectionsList(pageId)
// ... etc
```

### 3. TypeScript-Ready
All hooks return properly typed data with:
- `data` - The fetched data
- `isLoading` - Loading state
- `error` - Error object
- `refetch` - Manual refetch function
- `isFetching` - Background fetching state

### 4. Developer Tools
React Query DevTools are enabled in development mode for debugging:
- View all queries and their states
- Inspect cache contents
- Manually trigger refetches
- Monitor query performance

## Cache Configuration

Default settings (can be overridden per-hook):

| Content Type | Stale Time | Cache Time | Refetch on Focus |
|-------------|-----------|-----------|------------------|
| Pages       | 5 min     | 10 min    | No               |
| Sections    | 5 min     | 10 min    | No               |
| Media       | 10 min    | 30 min    | No               |
| Navigation  | 15 min    | 60 min    | No               |
| Settings    | 15 min    | 60 min    | No               |

## Usage Examples

### Basic Usage
```javascript
import { usePages } from 'src/api/cms-query';

function PagesList() {
  const { data, isLoading, error } = usePages({ status: 'published' });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      {data?.pages?.map(page => (
        <div key={page.id}>{page.title}</div>
      ))}
    </div>
  );
}
```

### With Custom Options
```javascript
const { data } = usePages(
  { status: 'published' },
  {
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: someCondition,
    onSuccess: (data) => console.log('Loaded:', data),
  }
);
```

### Cache Invalidation
```javascript
import { useInvalidateCMS } from 'src/api/cms-query';

function PageActions({ pageId }) {
  const invalidate = useInvalidateCMS();

  const handleUpdate = async () => {
    await updatePage(pageId);
    invalidate.invalidatePage(pageId);
    invalidate.invalidatePages();
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

## Comparison with SWR

Both implementations coexist in the codebase:

| Feature | SWR (cms.js) | React Query (cms-query.js) |
|---------|--------------|---------------------------|
| Bundle Size | Smaller | Slightly larger |
| DevTools | No | Yes |
| Prefetching | Manual | Built-in |
| Cache Keys | Automatic | Structured |
| Mutations | Manual | Built-in |
| TypeScript | Good | Excellent |
| Learning Curve | Lower | Moderate |

## Migration Path

The React Query hooks can be adopted gradually:

1. **Phase 1**: Use for new features
2. **Phase 2**: Migrate high-traffic pages
3. **Phase 3**: Migrate remaining components
4. **Phase 4**: Remove SWR (optional)

Both implementations can coexist indefinitely.

## Best Practices

1. **Use Query Keys Consistently**: Always use the exported `cmsKeys` object
2. **Handle Loading States**: Always show loading indicators
3. **Handle Errors**: Provide user-friendly error messages
4. **Invalidate After Mutations**: Keep cache fresh after updates
5. **Use Enabled Option**: For conditional queries
6. **Prefetch Predictable Navigation**: Improve UX with prefetching
7. **Monitor DevTools**: Use in development to optimize queries

## Performance Considerations

### Optimizations Implemented
- Aggressive caching for static content (navigation, settings)
- Shorter cache times for dynamic content (pages, sections)
- Disabled refetch on window focus by default
- Retry logic: 1 attempt for queries, 0 for mutations

### Monitoring
Use React Query DevTools to monitor:
- Cache hit rates
- Query execution times
- Background refetch frequency
- Memory usage

## Troubleshooting

### Query Not Fetching
- Check if `enabled` option is set correctly
- Verify query key is unique
- Check network tab for API errors

### Stale Data
- Adjust `staleTime` for your use case
- Use `refetch()` for manual updates
- Invalidate cache after mutations

### Memory Issues
- Reduce `cacheTime` for large datasets
- Use pagination for lists
- Clear unused queries with `queryClient.clear()`

## Future Enhancements

Potential improvements:
1. Add mutation hooks for create/update/delete operations
2. Implement optimistic updates
3. Add infinite scroll queries for lists
4. Create custom hooks for complex data transformations
5. Add request deduplication
6. Implement retry strategies per content type

## Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [cms-query-examples.md](./cms-query-examples.md) - Detailed usage examples
- [cms-query-demo.js](./cms-query-demo.js) - Demo components

## Support

For questions or issues:
1. Check the examples in `cms-query-examples.md`
2. Review demo components in `cms-query-demo.js`
3. Use React Query DevTools for debugging
4. Consult React Query documentation

## Changelog

### v1.0.0 (Initial Implementation)
- Created all CMS data fetching hooks
- Configured QueryClient with optimal defaults
- Integrated QueryProvider into App.js
- Added comprehensive documentation and examples
- Implemented cache invalidation utilities
- Added developer tools for debugging
