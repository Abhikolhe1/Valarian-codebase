import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import * as cmsQuery from 'src/api/cms-query';
import { useFooterNavigation } from './use-footer-navigation';

jest.mock('src/api/cms-query');

describe('useFooterNavigation', () => {
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

    const { result } = renderHook(() => useFooterNavigation(), { wrapper });

    await waitFor(() => {
      expect(result.current.navigation).toHaveLength(3);
      expect(result.current.navigation[0].headline).toBe('Valiarian');
      expect(result.current.navigation[1].headline).toBe('Legal');
      expect(result.current.navigation[2].headline).toBe('Contact');
      expect(result.current.isFromCMS).toBe(false);
    });
  });

  it('should return CMS navigation when available', async () => {
    const mockNavigation = {
      items: [
        { id: 1, label: 'Company', url: '#', order: 1, parentId: null },
        { id: 2, label: 'About', url: '/about', order: 1, parentId: 1 },
        { id: 3, label: 'Careers', url: '/careers', order: 2, parentId: 1 },
        { id: 4, label: 'Support', url: '#', order: 2, parentId: null },
        { id: 5, label: 'Help Center', url: '/help', order: 1, parentId: 4 },
      ],
    };

    cmsQuery.useNavigation.mockReturnValue({
      data: mockNavigation,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useFooterNavigation(), { wrapper });

    await waitFor(() => {
      expect(result.current.navigation).toHaveLength(2);
      expect(result.current.navigation[0].headline).toBe('Company');
      expect(result.current.navigation[0].children).toHaveLength(2);
      expect(result.current.navigation[1].headline).toBe('Support');
      expect(result.current.navigation[1].children).toHaveLength(1);
      expect(result.current.isFromCMS).toBe(true);
    });
  });

  it('should handle loading state', () => {
    cmsQuery.useNavigation.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useFooterNavigation(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch navigation');

    cmsQuery.useNavigation.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useFooterNavigation(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe(mockError);
      expect(result.current.navigation).toHaveLength(3); // Falls back to default
    });
  });
});
