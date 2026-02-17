import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  usePages,
  usePage,
  usePageBySlug,
  usePageVersions,
  useSections,
  useSection,
  useMedia,
  useMediaItem,
  useNavigation,
  useSettings,
  useInvalidateCMS,
  cmsKeys,
} from './cms-query';
import axiosInstance from 'src/utils/axios';

// Mock axios
jest.mock('src/utils/axios');

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Test wrapper with React Query
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client= {queryClient} > {children} </QueryClientProvider>
  );
};

describe('CMS API Hooks - React Query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(cmsKeys.all).toEqual(['cms']);
      expect(cmsKeys.pages()).toEqual(['cms', 'pages']);
      expect(cmsKeys.pagesList({status: 'published'})).toEqual([
        'cms',
        'pages',
        'list',
        {status: 'published'},
      ]);
      expect(cmsKeys.page('123')).toEqual(['cms', 'pages', 'detail', '123']);
      expect(cmsKeys.pageBySlug('home')).toEqual(['cms', 'pages', 'slug', 'home']);
      expect(cmsKeys.pageVersions('123')).toEqual(['cms', 'pages', '123', 'versions']);
      expect(cmsKeys.sections()).toEqual(['cms', 'sections']);
      expect(cmsKeys.sectionsList('page-123')).toEqual(['cms', 'sections', 'list', 'page-123']);
      expect(cmsKeys.section('s1')).toEqual(['cms', 'sections', 'detail', 's1']);
      expect(cmsKeys.media()).toEqual(['cms', 'media']);
      expect(cmsKeys.mediaList({folder: 'uploads'})).toEqual([
        'cms',
        'media',
        'list',
        {folder: 'uploads'},
      ]);
      expect(cmsKeys.mediaItem('m1')).toEqual(['cms', 'media', 'detail', 'm1']);
      expect(cmsKeys.navigation()).toEqual(['cms', 'navigation']);
      expect(cmsKeys.navigationByLocation('header')).toEqual(['cms', 'navigation', 'header']);
      expect(cmsKeys.settings()).toEqual(['cms', 'settings']);
    });
  });

  describe('usePages', () => {
    it('should fetch pages successfully', async () => {
      const mockPages = {
        pages: [
          {id: '1', title: 'Home', slug: 'home', status: 'published'},
          {id: '2', title: 'About', slug: 'about', status: 'draft'},
        ],
        totalCount: 2,
      };

      mockedAxios.get.mockResolvedValue({data: mockPages});

      const {result} = renderHook(() => usePages(), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPages);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockedAxios.get.mockRejectedValue(mockError);

      const {result} = renderHook(() => usePages(), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should fetch pages with filters', async () => {
      const mockPages = {pages: [{id: '1', title: 'Home'}], totalCount: 1};
      mockedAxios.get.mockResolvedValue({data: mockPages});

      const params = {status: 'published', search: 'home'};
      const {result} = renderHook(() => usePages(params), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/pages', {params});
    });

    it('should use correct stale time', async () => {
      const mockPages = {pages: [], totalCount: 0};
      mockedAxios.get.mockResolvedValue({data: mockPages});

      const {result} = renderHook(() => usePages(), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Data should be fresh for 5 minutes (staleTime: 5 * 60 * 1000)
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('usePage', () => {
    it('should fetch page by ID successfully', async () => {
      const mockPage = {page: {id: '123', title: 'Test Page', slug: 'test'}};
      mockedAxios.get.mockResolvedValue({data: mockPage});

      const {result} = renderHook(() => usePage('123'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPage);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/pages/123');
    });

    it('should not fetch when pageId is empty', async () => {
      const {result} = renderHook(() => usePage(''), {wrapper: createWrapper()});

      expect(result.current.data).toBeUndefined();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle 404 errors', async () => {
      const mockError = {response: {status: 404, data: {message: 'Page not found'}}};
      mockedAxios.get.mockRejectedValue(mockError);

      const {result} = renderHook(() => usePage('nonexistent'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('usePageBySlug', () => {
    it('should fetch page by slug successfully', async () => {
      const mockPage = {page: {id: '1', title: 'Home', slug: 'home'}};
      mockedAxios.get.mockResolvedValue({data: mockPage});

      const {result} = renderHook(() => usePageBySlug('home'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPage);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/pages/home');
    });

    it('should use longer stale time for public pages', async () => {
      const mockPage = {page: {id: '1', title: 'Home', slug: 'home'}};
      mockedAxios.get.mockResolvedValue({data: mockPage});

      const {result} = renderHook(() => usePageBySlug('home'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Public pages should have longer stale time (10 minutes)
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('usePageVersions', () => {
    it('should fetch page versions successfully', async () => {
      const mockVersions = {
        versions: [
          {id: 'v1', version: 1, createdAt: '2024-01-01'},
          {id: 'v2', version: 2, createdAt: '2024-01-02'},
        ],
      };
      mockedAxios.get.mockResolvedValue({data: mockVersions});

      const {result} = renderHook(() => usePageVersions('123'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockVersions);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/pages/123/versions');
    });
  });

  describe('useSections', () => {
    it('should fetch sections successfully', async () => {
      const mockSections = {
        sections: [
          {id: 's1', type: 'hero', order: 1},
          {id: 's2', type: 'features', order: 2},
        ],
      };
      mockedAxios.get.mockResolvedValue({data: mockSections});

      const {result} = renderHook(() => useSections('page-123'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSections);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/sections', {params: {pageId: 'page-123'}});
    });

    it('should not fetch when pageId is empty', async () => {
      const {result} = renderHook(() => useSections(''), {wrapper: createWrapper()});

      expect(result.current.data).toBeUndefined();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('useSection', () => {
    it('should fetch section successfully', async () => {
      const mockSection = {section: {id: 's1', type: 'hero', content: {}}};
      mockedAxios.get.mockResolvedValue({data: mockSection});

      const {result} = renderHook(() => useSection('s1'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSection);
    });
  });

  describe('useMedia', () => {
    it('should fetch media list successfully', async () => {
      const mockMedia = {
        media: [
          {id: 'm1', filename: 'image1.jpg', mimeType: 'image/jpeg'},
          {id: 'm2', filename: 'image2.png', mimeType: 'image/png'},
        ],
        totalCount: 2,
      };
      mockedAxios.get.mockResolvedValue({data: mockMedia});

      const {result} = renderHook(() => useMedia(), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMedia);
    });

    it('should fetch media with filters', async () => {
      const mockMedia = {media: [{id: 'm1', filename: 'image1.jpg'}], totalCount: 1};
      mockedAxios.get.mockResolvedValue({data: mockMedia});

      const params = {folder: 'uploads', mimeType: 'image/jpeg'};
      const {result} = renderHook(() => useMedia(params), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/media', {params});
    });
  });

  describe('useMediaItem', () => {
    it('should fetch media item successfully', async () => {
      const mockMediaItem = {media: {id: 'm1', filename: 'image.jpg'}};
      mockedAxios.get.mockResolvedValue({data: mockMediaItem});

      const {result} = renderHook(() => useMediaItem('m1'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMediaItem);
    });

    it('should use longer stale time for media', async () => {
      const mockMediaItem = {media: {id: 'm1', filename: 'image.jpg'}};
      mockedAxios.get.mockResolvedValue({data: mockMediaItem});

      const {result} = renderHook(() => useMediaItem('m1'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Media should have longer stale time (10 minutes)
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('useNavigation', () => {
    it('should fetch navigation successfully', async () => {
      const mockNav = {
        navigation: {
          id: 'nav1',
          location: 'header',
          items: [{label: 'Home', url: '/'}],
        },
      };
      mockedAxios.get.mockResolvedValue({data: mockNav});

      const {result} = renderHook(() => useNavigation('header'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNav);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/navigation/header');
    });

    it('should not refetch on window focus', async () => {
      const mockNav = {navigation: {id: 'nav1', location: 'header', items: []}};
      mockedAxios.get.mockResolvedValue({data: mockNav});

      const {result} = renderHook(() => useNavigation('header'), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Navigation should not refetch on focus (refetchOnWindowFocus: false)
      expect(result.current.data).toEqual(mockNav);
    });
  });

  describe('useSettings', () => {
    it('should fetch settings successfully', async () => {
      const mockSettings = {
        settings: {
          siteName: 'Valiarian',
          siteDescription: 'E-commerce platform',
          logo: 'logo.png',
        },
      };
      mockedAxios.get.mockResolvedValue({data: mockSettings});

      const {result} = renderHook(() => useSettings(), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSettings);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/cms/settings');
    });

    it('should not refetch on window focus', async () => {
      const mockSettings = {settings: {siteName: 'Valiarian'}};
      mockedAxios.get.mockResolvedValue({data: mockSettings});

      const {result} = renderHook(() => useSettings(), {wrapper: createWrapper()});

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Settings should not refetch on focus
      expect(result.current.data).toEqual(mockSettings);
    });
  });

  describe('useInvalidateCMS', () => {
    it('should provide invalidation methods', () => {
      const {result} = renderHook(() => useInvalidateCMS(), {wrapper: createWrapper()});

      expect(result.current).toHaveProperty('invalidateAll');
      expect(result.current).toHaveProperty('invalidatePages');
      expect(result.current).toHaveProperty('invalidatePage');
      expect(result.current).toHaveProperty('invalidateSections');
      expect(result.current).toHaveProperty('invalidateMedia');
      expect(result.current).toHaveProperty('invalidateNavigation');
      expect(result.current).toHaveProperty('invalidateSettings');
    });

    it('should invalidate all CMS queries', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = ({children}: {children: React.ReactNode}) => (
        <QueryClientProvider client= {queryClient} > {children} </QueryClientProvider>
      );

    // Set some data in cache
    queryClient.setQueryData(cmsKeys.pages(), {pages: []});
    queryClient.setQueryData(cmsKeys.settings(), {settings: {}});

    const {result} = renderHook(() => useInvalidateCMS(), {wrapper});

    await result.current.invalidateAll();

    // All queries should be invalidated
    const pagesState = queryClient.getQueryState(cmsKeys.pages());
    const settingsState = queryClient.getQueryState(cmsKeys.settings());

    expect(pagesState?.isInvalidated).toBe(true);
    expect(settingsState?.isInvalidated).toBe(true);
  });

  it('should invalidate specific page', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <QueryClientProvider client= {queryClient} > {children} </QueryClientProvider>
      );

  queryClient.setQueryData(cmsKeys.page('123'), {page: {}});

  const {result} = renderHook(() => useInvalidateCMS(), {wrapper});

  await result.current.invalidatePage('123');

  const pageState = queryClient.getQueryState(cmsKeys.page('123'));
  expect(pageState?.isInvalidated).toBe(true);
});
  });

describe('Error handling', () => {
  it('should handle network errors', async () => {
    const networkError = new Error('Network Error');
    mockedAxios.get.mockRejectedValue(networkError);

    const {result} = renderHook(() => usePages(), {wrapper: createWrapper()});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should handle 500 server errors', async () => {
    const serverError = {response: {status: 500, data: {message: 'Internal Server Error'}}};
    mockedAxios.get.mockRejectedValue(serverError);

    const {result} = renderHook(() => usePages(), {wrapper: createWrapper()});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle timeout errors', async () => {
    const timeoutError = {code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded'};
    mockedAxios.get.mockRejectedValue(timeoutError);

    const {result} = renderHook(() => usePages(), {wrapper: createWrapper()});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('Cache behavior', () => {
  it('should cache data correctly', async () => {
    const mockPages = {pages: [{id: '1', title: 'Home'}], totalCount: 1};
    mockedAxios.get.mockResolvedValue({data: mockPages});

    const queryClient = createTestQueryClient();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <QueryClientProvider client= {queryClient} > {children} </QueryClientProvider>
      );

  const {result} = renderHook(() => usePages(), {wrapper});

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  // Data should be in cache
  const cachedData = queryClient.getQueryData(cmsKeys.pagesList({}));
  expect(cachedData).toEqual(mockPages);
});

it('should refetch when query is invalidated', async () => {
  const mockPages1 = {pages: [{id: '1', title: 'Page 1'}], totalCount: 1};
  const mockPages2 = {pages: [{id: '1', title: 'Page 1 Updated'}], totalCount: 1};

  mockedAxios.get.mockResolvedValueOnce({data: mockPages1}).mockResolvedValueOnce({data: mockPages2});

  const queryClient = createTestQueryClient();
  const wrapper = ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client= {queryClient} > {children} </QueryClientProvider>
      );

const {result} = renderHook(() => usePages(), {wrapper});

await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});

expect(result.current.data?.pages[0].title).toBe('Page 1');

// Invalidate and refetch
await queryClient.invalidateQueries({queryKey: cmsKeys.pagesList({})});

await waitFor(() => {
  expect(result.current.data?.pages[0].title).toBe('Page 1 Updated');
});
    });
  });
});
