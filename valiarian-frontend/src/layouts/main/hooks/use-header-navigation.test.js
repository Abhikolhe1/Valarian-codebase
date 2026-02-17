import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import * as cmsQuery from 'src/api/cms-query';
import { useHeaderNavigation } from './use-header-navigation';

jest.mock('src/api/cms-query');

describe('useHeaderNavigation', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return default navigation when CMS data is not available', async () => {
    cmsQuery.useNavigation.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useHeaderNavigation(), { wrapper });

    await waitFor(() => {
      expect(result.current.navigation).toHaveLength(3);
      expect(result.current.navigation[0].title).toBe('Category');
      expect(result.current.navigation[1].title).toBe('Premium');
      expect(result.current.navigation[2].title).toBe('About Us');
      expect(result.current.isFromCMS).toBe(false);
    });
  });

  it('should return CMS navigation when available', async () => {
    const mockNavigation = {
      items: [
        { id: 1, label: 'Home', url: '/', order: 1, icon: 'home' },
        { id: 2, label: 'Shop', url: '/shop', order: 2, icon: 'shopping-bag' },
        { id: 3, label: 'Contact', url: '/contact', order: 3, icon: 'mail' },
      ],
    };

    cmsQuery.useNavigation.mockReturnValue({
      data: mockNavigation,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useHeaderNavigation(), { wrapper });

    await waitFor(() => {
      expect(result.current.navigation).toHaveLength(3);
      expect(result.current.navigation[0].title).toBe('Home');
      expect(result.current.navigation[1].title).toBe('Shop');
      expect(result.current.navigation[2].title).toBe('Contact');
      expect(result.current.isFromCMS).toBe(true);
    });
  });

  it('should handle loading state', () => {
    cmsQuery.useNavigation.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useHeaderNavigation(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch navigation');

    cmsQuery.useNavigation.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useHeaderNavigation(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe(mockError);
      expect(result.current.navigation).toHaveLength(3); // Falls back to default
    });
  });
});
