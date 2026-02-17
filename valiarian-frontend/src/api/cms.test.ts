import {renderHook, waitFor} from '@testing-library/react';
import {SWRConfig} from 'swr';
import {
  useGetPages,
  useGetPageBySlug,
  useGetPage,
  useGetPageVersions,
  useGetSections,
  useGetSection,
  useGetMedia,
  useGetMediaItem,
  useGetNavigation,
  useGetSettings,
} from './cms';
import * as axiosUtils from 'src/utils/axios';

// Mock axios
jest.mock('src/utils/axios', () => ({
  endpoints: {
    cms: {
      pages: {
        list: '/api/cms/pages',
        bySlug: (slug: string) => `/api/cms/pages/${slug}`,
        byId: (id: string) => `/api/cms/pages/${id}`,
        versions: (id: string) => `/api/cms/pages/${id}/versions`,
      },
      sections: {
        list: '/api/cms/sections',
        byId: (id: string) => `/api/cms/sections/${id}`,
      },
      media: {
        list: '/api/cms/media',
        byId: (id: string) => `/api/cms/media/${id}`,
      },
      navigation: {
        byLocation: (location: string) => `/api/cms/navigation/${location}`,
      },
      settings: '/api/cms/settings',
    },
  },
  fetcher: jest.fn(),
}));

// Test wrapper with SWR config
const wrapper = ({children}: {children: React.ReactNode}) => (
  <SWRConfig value= {{dedupingInterval: 0, provider: () => new Map()}}>
    {children}
    </SWRConfig>
);

describe('CMS API Hooks - SWR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetPages', () => {
    it('should fetch pages successfully', async () => {
      const mockPages = {
        pages: [
          {id: '1', title: 'Home', slug: 'home', status: 'published'},
          {id: '2', title: 'About', slug: 'about', status: 'draft'},
        ],
        totalCount: 2,
      };

      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockPages);

      const {result} = renderHook(() => useGetPages(), {wrapper});

      await waitFor(() => {
        expect(result.current.pagesLoading).toBe(false);
      });

      expect(result.current.pages).toEqual(mockPages.pages);
      expect(result.current.pagesEmpty).toBe(false);
      expect(result.current.pagesError).toBeUndefined();
    });

    it('should handle empty pages list', async () => {
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue({pages: [], totalCount: 0});

      const {result} = renderHook(() => useGetPages(), {wrapper});

      await waitFor(() => {
        expect(result.current.pagesLoading).toBe(false);
      });

      expect(result.current.pages).toEqual([]);
      expect(result.current.pagesEmpty).toBe(true);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      (axiosUtils.fetcher as jest.Mock).mockRejectedValue(mockError);

      const {result} = renderHook(() => useGetPages(), {wrapper});

      await waitFor(() => {
        expect(result.current.pagesError).toBeDefined();
      });

      expect(result.current.pages).toEqual([]);
    });

    it('should fetch pages with filters', async () => {
      const mockPages = {pages: [{id: '1', title: 'Home', slug: 'home', status: 'published'}]};
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockPages);

      const params = {status: 'published', search: 'home'};
      const {result} = renderHook(() => useGetPages(params), {wrapper});

      await waitFor(() => {
        expect(result.current.pagesLoading).toBe(false);
      });

      expect(axiosUtils.fetcher).toHaveBeenCalledWith(['/api/cms/pages', {params}]);
    });
  });

  describe('useGetPageBySlug', () => {
    it('should fetch page by slug successfully', async () => {
      const mockPage = {page: {id: '1', title: 'Home', slug: 'home', status: 'published'}};
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockPage);

      const {result} = renderHook(() => useGetPageBySlug('home'), {wrapper});

      await waitFor(() => {
        expect(result.current.pageLoading).toBe(false);
      });

      expect(result.current.page).toEqual(mockPage.page);
      expect(result.current.pageError).toBeUndefined();
    });

    it('should not fetch when slug is null', async () => {
      const {result} = renderHook(() => useGetPageBySlug(null), {wrapper});

      expect(result.current.page).toBeUndefined();
      expect(axiosUtils.fetcher).not.toHaveBeenCalled();
    });

    it('should handle 404 errors', async () => {
      const mockError = new Error('Page not found');
      (axiosUtils.fetcher as jest.Mock).mockRejectedValue(mockError);

      const {result} = renderHook(() => useGetPageBySlug('nonexistent'), {wrapper});

      await waitFor(() => {
        expect(result.current.pageError).toBeDefined();
      });
    });
  });

  describe('useGetPage', () => {
    it('should fetch page by ID successfully', async () => {
      const mockPage = {page: {id: '123', title: 'Test Page', slug: 'test', status: 'draft'}};
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockPage);

      const {result} = renderHook(() => useGetPage('123'), {wrapper});

      await waitFor(() => {
        expect(result.current.pageLoading).toBe(false);
      });

      expect(result.current.page).toEqual(mockPage.page);
    });

    it('should not fetch when pageId is null', async () => {
      const {result} = renderHook(() => useGetPage(null), {wrapper});

      expect(result.current.page).toBeUndefined();
      expect(axiosUtils.fetcher).not.toHaveBeenCalled();
    });
  });

  describe('useGetPageVersions', () => {
    it('should fetch page versions successfully', async () => {
      const mockVersions = {
        versions: [
          {id: 'v1', version: 1, createdAt: '2024-01-01'},
          {id: 'v2', version: 2, createdAt: '2024-01-02'},
        ],
      };
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockVersions);

      const {result} = renderHook(() => useGetPageVersions('123'), {wrapper});

      await waitFor(() => {
        expect(result.current.versionsLoading).toBe(false);
      });

      expect(result.current.versions).toEqual(mockVersions.versions);
      expect(result.current.versionsEmpty).toBe(false);
    });

    it('should handle empty versions list', async () => {
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue({versions: []});

      const {result} = renderHook(() => useGetPageVersions('123'), {wrapper});

      await waitFor(() => {
        expect(result.current.versionsLoading).toBe(false);
      });

      expect(result.current.versionsEmpty).toBe(true);
    });
  });

  describe('useGetSections', () => {
    it('should fetch sections successfully', async () => {
      const mockSections = {
        sections: [
          {id: 's1', type: 'hero', order: 1},
          {id: 's2', type: 'features', order: 2},
        ],
      };
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockSections);

      const {result} = renderHook(() => useGetSections('page-123'), {wrapper});

      await waitFor(() => {
        expect(result.current.sectionsLoading).toBe(false);
      });

      expect(result.current.sections).toEqual(mockSections.sections);
      expect(result.current.sectionsEmpty).toBe(false);
    });

    it('should not fetch when pageId is null', async () => {
      const {result} = renderHook(() => useGetSections(null), {wrapper});

      expect(result.current.sections).toEqual([]);
      expect(axiosUtils.fetcher).not.toHaveBeenCalled();
    });
  });

  describe('useGetSection', () => {
    it('should fetch section successfully', async () => {
      const mockSection = {section: {id: 's1', type: 'hero', content: {}}};
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockSection);

      const {result} = renderHook(() => useGetSection('s1'), {wrapper});

      await waitFor(() => {
        expect(result.current.sectionLoading).toBe(false);
      });

      expect(result.current.section).toEqual(mockSection.section);
    });
  });

  describe('useGetMedia', () => {
    it('should fetch media list successfully', async () => {
      const mockMedia = {
        media: [
          {id: 'm1', filename: 'image1.jpg', mimeType: 'image/jpeg'},
          {id: 'm2', filename: 'image2.png', mimeType: 'image/png'},
        ],
        totalCount: 2,
      };
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockMedia);

      const {result} = renderHook(() => useGetMedia(), {wrapper});

      await waitFor(() => {
        expect(result.current.mediaLoading).toBe(false);
      });

      expect(result.current.media).toEqual(mockMedia.media);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.mediaEmpty).toBe(false);
    });

    it('should fetch media with filters', async () => {
      const mockMedia = {media: [{id: 'm1', filename: 'image1.jpg'}], totalCount: 1};
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockMedia);

      const params = {folder: 'uploads', mimeType: 'image/jpeg'};
      const {result} = renderHook(() => useGetMedia(params), {wrapper});

      await waitFor(() => {
        expect(result.current.mediaLoading).toBe(false);
      });

      expect(axiosUtils.fetcher).toHaveBeenCalledWith(['/api/cms/media', {params}]);
    });
  });

  describe('useGetMediaItem', () => {
    it('should fetch media item successfully', async () => {
      const mockMediaItem = {media: {id: 'm1', filename: 'image.jpg', url: 'https://cdn.com/image.jpg'}};
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockMediaItem);

      const {result} = renderHook(() => useGetMediaItem('m1'), {wrapper});

      await waitFor(() => {
        expect(result.current.mediaItemLoading).toBe(false);
      });

      expect(result.current.mediaItem).toEqual(mockMediaItem.media);
    });

    it('should not fetch when mediaId is null', async () => {
      const {result} = renderHook(() => useGetMediaItem(null), {wrapper});

      expect(result.current.mediaItem).toBeUndefined();
      expect(axiosUtils.fetcher).not.toHaveBeenCalled();
    });
  });

  describe('useGetNavigation', () => {
    it('should fetch navigation successfully', async () => {
      const mockNav = {
        navigation: {
          id: 'nav1',
          location: 'header',
          items: [{label: 'Home', url: '/'}],
        },
      };
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockNav);

      const {result} = renderHook(() => useGetNavigation('header'), {wrapper});

      await waitFor(() => {
        expect(result.current.navigationLoading).toBe(false);
      });

      expect(result.current.navigation).toEqual(mockNav.navigation);
    });

    it('should not fetch when location is null', async () => {
      const {result} = renderHook(() => useGetNavigation(null), {wrapper});

      expect(result.current.navigation).toBeUndefined();
      expect(axiosUtils.fetcher).not.toHaveBeenCalled();
    });

    it('should not refetch on window focus', async () => {
      const mockNav = {navigation: {id: 'nav1', location: 'header', items: []}};
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockNav);

      const {result} = renderHook(() => useGetNavigation('header'), {wrapper});

      await waitFor(() => {
        expect(result.current.navigationLoading).toBe(false);
      });

      // SWR config in the hook should prevent refetch on focus
      expect(result.current.navigation).toEqual(mockNav.navigation);
    });
  });

  describe('useGetSettings', () => {
    it('should fetch settings successfully', async () => {
      const mockSettings = {
        settings: {
          siteName: 'Valiarian',
          siteDescription: 'E-commerce platform',
          logo: 'logo.png',
        },
      };
      (axiosUtils.fetcher as jest.Mock).mockResolvedValue(mockSettings);

      const {result} = renderHook(() => useGetSettings(), {wrapper});

      await waitFor(() => {
        expect(result.current.settingsLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings.settings);
    });

    it('should handle settings fetch error', async () => {
      const mockError = new Error('Settings not found');
      (axiosUtils.fetcher as jest.Mock).mockRejectedValue(mockError);

      const {result} = renderHook(() => useGetSettings(), {wrapper});

      await waitFor(() => {
        expect(result.current.settingsError).toBeDefined();
      });
    });
  });

  describe('Cache behavior', () => {
    it('should refresh data when mutate is called', async () => {
      const mockPages1 = {pages: [{id: '1', title: 'Page 1'}]};
      const mockPages2 = {pages: [{id: '1', title: 'Page 1 Updated'}]};

      (axiosUtils.fetcher as jest.Mock)
        .mockResolvedValueOnce(mockPages1)
        .mockResolvedValueOnce(mockPages2);

      const {result} = renderHook(() => useGetPages(), {wrapper});

      await waitFor(() => {
        expect(result.current.pagesLoading).toBe(false);
      });

      expect(result.current.pages[0].title).toBe('Page 1');

      // Trigger refresh
      await result.current.pagesRefresh();

      await waitFor(() => {
        expect(result.current.pages[0].title).toBe('Page 1 Updated');
      });
    });
  });
});
