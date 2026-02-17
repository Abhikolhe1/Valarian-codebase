# CMS API Tests Documentation

## Overview
This directory contains comprehensive tests for the CMS API client and React hooks. The tests cover both SWR-based hooks (`cms.ts`) and React Query hooks (`cms-query.ts`).

## Test Files

### 1. `cms.test.ts` - SWR Hooks Tests
Tests for the SWR-based hooks that fetch CMS data.

**Coverage:**
- ✅ `useGetPages` - Fetch pages with filters, pagination, error handling
- ✅ `useGetPageBySlug` - Fetch page by slug, null handling, 404 errors
- ✅ `useGetPage` - Fetch page by ID
- ✅ `useGetPageVersions` - Fetch page versions, empty list handling
- ✅ `useGetSections` - Fetch sections for a page
- ✅ `useGetSection` - Fetch single section
- ✅ `useGetMedia` - Fetch media with filters
- ✅ `useGetMediaItem` - Fetch single media item
- ✅ `useGetNavigation` - Fetch navigation menu, no refetch on focus
- ✅ `useGetSettings` - Fetch site settings
- ✅ Cache behavior - Test data refresh with mutate

**Test Scenarios:**
- Successful data fetching
- Empty data handling
- API error handling
- Null parameter handling (disabled queries)
- Filter and parameter passing
- Cache refresh behavior
- Loading and error states

### 2. `cms-query.test.ts` - React Query Hooks Tests
Tests for the React Query hooks that provide advanced caching and state management.

**Coverage:**
- ✅ Query key generation (`cmsKeys`)
- ✅ `usePages` - Fetch pages with filters, stale time
- ✅ `usePage` - Fetch page by ID, enabled flag
- ✅ `usePageBySlug` - Fetch page by slug, longer stale time
- ✅ `usePageVersions` - Fetch page versions
- ✅ `useSections` - Fetch sections for a page
- ✅ `useSection` - Fetch single section
- ✅ `useMedia` - Fetch media with filters
- ✅ `useMediaItem` - Fetch single media item, longer stale time
- ✅ `useNavigation` - Fetch navigation, no refetch on focus
- ✅ `useSettings` - Fetch settings, no refetch on focus
- ✅ `useInvalidateCMS` - Cache invalidation methods
- ✅ Error handling - Network, 500, timeout errors
- ✅ Cache behavior - Data caching, invalidation, refetch

**Test Scenarios:**
- Query key structure validation
- Successful data fetching
- API error handling (network, 500, timeout)
- Enabled/disabled queries
- Stale time configuration
- Refetch behavior (window focus, reconnect)
- Cache invalidation
- Data persistence in cache

## Prerequisites

### Required Dependencies
The following packages need to be installed to run the tests:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @types/jest
```

Or with yarn:

```bash
yarn add -D @testing-library/react @testing-library/jest-dom @types/jest
```

### Package Versions
- `@testing-library/react`: ^14.0.0 or higher
- `@testing-library/jest-dom`: ^6.0.0 or higher
- `@types/jest`: ^29.0.0 or higher

## Running the Tests

### Add Test Script
Add the following script to `package.json`:

```json
{
  "scripts": {
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "test:ci": "CI=true react-scripts test --coverage"
  }
}
```

### Run Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Run specific test file
npm test cms.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="useGetPages"
```

## Test Structure

### SWR Tests (`cms.test.ts`)
```typescript
describe('CMS API Hooks - SWR', () => {
  describe('useGetPages', () => {
    it('should fetch pages successfully', async () => {
      // Test implementation
    });

    it('should handle API errors', async () => {
      // Test implementation
    });
  });
});
```

### React Query Tests (`cms-query.test.ts`)
```typescript
describe('CMS API Hooks - React Query', () => {
  describe('usePages', () => {
    it('should fetch pages successfully', async () => {
      // Test implementation
    });

    it('should handle API errors', async () => {
      // Test implementation
    });
  });
});
```

## Mocking Strategy

### Axios Mocking
Both test files mock the axios instance:

```typescript
jest.mock('src/utils/axios');
const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;
```

### SWR Fetcher Mocking
```typescript
jest.mock('src/utils/axios', () => ({
  endpoints: { /* ... */ },
  fetcher: jest.fn(),
}));
```

### Test Wrappers

**SWR Wrapper:**
```typescript
const wrapper = ({children}: {children: React.ReactNode}) => (
  <SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
    {children}
  </SWRConfig>
);
```

**React Query Wrapper:**
```typescript
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
```

## Error Handling Tests

### Network Errors
```typescript
it('should handle network errors', async () => {
  const networkError = new Error('Network Error');
  mockedAxios.get.mockRejectedValue(networkError);

  const {result} = renderHook(() => usePages(), {wrapper});

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });
});
```

### HTTP Errors
```typescript
it('should handle 404 errors', async () => {
  const mockError = {response: {status: 404, data: {message: 'Not found'}}};
  mockedAxios.get.mockRejectedValue(mockError);

  // Test implementation
});
```

### Timeout Errors
```typescript
it('should handle timeout errors', async () => {
  const timeoutError = {code: 'ECONNABORTED', message: 'timeout exceeded'};
  mockedAxios.get.mockRejectedValue(timeoutError);

  // Test implementation
});
```

## Cache Behavior Tests

### SWR Cache Refresh
```typescript
it('should refresh data when mutate is called', async () => {
  const mockData1 = {pages: [{id: '1', title: 'Page 1'}]};
  const mockData2 = {pages: [{id: '1', title: 'Page 1 Updated'}]};

  (axiosUtils.fetcher as jest.Mock)
    .mockResolvedValueOnce(mockData1)
    .mockResolvedValueOnce(mockData2);

  const {result} = renderHook(() => useGetPages(), {wrapper});

  await waitFor(() => expect(result.current.pagesLoading).toBe(false));
  expect(result.current.pages[0].title).toBe('Page 1');

  await result.current.pagesRefresh();

  await waitFor(() => {
    expect(result.current.pages[0].title).toBe('Page 1 Updated');
  });
});
```

### React Query Cache Invalidation
```typescript
it('should refetch when query is invalidated', async () => {
  const mockData1 = {pages: [{id: '1', title: 'Page 1'}]};
  const mockData2 = {pages: [{id: '1', title: 'Page 1 Updated'}]};

  mockedAxios.get
    .mockResolvedValueOnce({data: mockData1})
    .mockResolvedValueOnce({data: mockData2});

  const {result} = renderHook(() => usePages(), {wrapper});

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.pages[0].title).toBe('Page 1');

  await queryClient.invalidateQueries({queryKey: cmsKeys.pagesList({})});

  await waitFor(() => {
    expect(result.current.data?.pages[0].title).toBe('Page 1 Updated');
  });
});
```

## Coverage Goals

### Target Coverage
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Current Coverage
Run `npm run test:coverage` to see current coverage metrics.

### Coverage Report
Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools
- `coverage/coverage-final.json` - JSON format

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clear mocks between tests with `jest.clearAllMocks()`
- Use fresh query clients for React Query tests

### 2. Async Testing
- Always use `waitFor` for async operations
- Don't use arbitrary timeouts
- Test loading states before success/error states

### 3. Mock Data
- Use realistic mock data structures
- Match actual API response formats
- Include all required fields

### 4. Error Testing
- Test all error scenarios (network, HTTP, timeout)
- Verify error states are set correctly
- Check error messages are propagated

### 5. Cache Testing
- Test stale time behavior
- Verify cache invalidation
- Test refetch scenarios

## Troubleshooting

### Common Issues

**Issue: Tests timeout**
```typescript
// Solution: Increase timeout for slow tests
jest.setTimeout(10000);
```

**Issue: Mock not working**
```typescript
// Solution: Ensure mock is before imports
jest.mock('src/utils/axios');
import axiosInstance from 'src/utils/axios';
```

**Issue: React Query cache persists**
```typescript
// Solution: Create new query client per test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
```

**Issue: SWR cache persists**
```typescript
// Solution: Use fresh cache provider
<SWRConfig value={{provider: () => new Map()}}>
  {children}
</SWRConfig>
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### GitLab CI Example
```yaml
test:
  script:
    - npm run test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## Future Enhancements

### Planned Test Additions
- [ ] Integration tests with MSW (Mock Service Worker)
- [ ] E2E tests with Cypress/Playwright
- [ ] Performance tests for cache behavior
- [ ] Accessibility tests for error states
- [ ] Visual regression tests for loading states

### Test Utilities
- [ ] Custom render function with all providers
- [ ] Mock data factories
- [ ] Test helpers for common scenarios
- [ ] Snapshot testing for complex responses

## References

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [SWR Testing](https://swr.vercel.app/docs/advanced/testing)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
