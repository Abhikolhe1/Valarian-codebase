import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import * as cmsQuery from 'src/api/cms-query';
import { SiteSettingsProvider, useSiteSettings } from './SiteSettingsContext';

// Mock the cms-query module
jest.mock('src/api/cms-query');

// Test component that uses the context
function TestComponent() {
  const { settings, isLoading, error, isFromCMS } = useSiteSettings();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div data-testid="site-name">{settings.general?.siteName}</div>
      <div data-testid="site-description">{settings.general?.siteDescription}</div>
      <div data-testid="is-from-cms">{isFromCMS ? 'true' : 'false'}</div>
    </div>
  );
}

describe('SiteSettingsContext', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component) =>
    render(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <SiteSettingsProvider>{component}</SiteSettingsProvider>
        </HelmetProvider>
      </QueryClientProvider>
    );

  it('should provide default settings when CMS data is not available', async () => {
    cmsQuery.useSettings.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('site-name')).toHaveTextContent('Valiarian');
      expect(screen.getByTestId('site-description')).toHaveTextContent('Premium Fashion E-commerce');
      expect(screen.getByTestId('is-from-cms')).toHaveTextContent('false');
    });
  });

  it('should provide CMS settings when available', async () => {
    const mockSettings = {
      general: {
        siteName: 'Custom Site Name',
        siteDescription: 'Custom Description',
        logo: '/custom-logo.svg',
        favicon: '/custom-favicon.ico',
      },
      seo: {
        defaultTitle: 'Custom Title',
        defaultDescription: 'Custom SEO Description',
      },
      socialMedia: {
        facebook: 'customfacebook',
        instagram: 'custominstagram',
      },
      analytics: {
        gtmId: 'GTM-XXXXX',
        gaId: 'GA-XXXXX',
      },
    };

    cmsQuery.useSettings.mockReturnValue({
      data: mockSettings,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('site-name')).toHaveTextContent('Custom Site Name');
      expect(screen.getByTestId('site-description')).toHaveTextContent('Custom Description');
      expect(screen.getByTestId('is-from-cms')).toHaveTextContent('true');
    });
  });

  it('should show loading state', () => {
    cmsQuery.useSettings.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithProviders(<TestComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Failed to fetch settings');

    cmsQuery.useSettings.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
    });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSiteSettings must be used within SiteSettingsProvider');

    consoleSpy.mockRestore();
  });
});
