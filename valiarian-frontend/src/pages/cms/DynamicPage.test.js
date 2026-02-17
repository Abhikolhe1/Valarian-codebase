import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import * as cmsQuery from 'src/api/cms-query';
import DynamicPage from './DynamicPage';

// Mock the cms-query module
jest.mock('src/api/cms-query');

// Create a test wrapper with all required providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/page/:slug" element={children} />
            <Route path="/" element={children} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };
};

describe('DynamicPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton while fetching page', () => {
    cmsQuery.usePageBySlug.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<DynamicPage slug="test-page" />, { wrapper: createWrapper() });

    // Check for skeleton elements
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders page sections when data is loaded', async () => {
    const mockPage = {
      page: {
        id: '1',
        slug: 'test-page',
        title: 'Test Page',
        status: 'published',
        sections: [
          {
            id: 'section-1',
            type: 'hero',
            name: 'Hero Section',
            order: 1,
            enabled: true,
            content: {
              heading: 'Welcome',
              subheading: 'Test Page',
            },
            settings: {},
          },
        ],
      },
    };

    cmsQuery.usePageBySlug.mockReturnValue({
      data: mockPage,
      isLoading: false,
      error: null,
    });

    render(<DynamicPage slug="test-page" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });

  it('renders error message when page fetch fails', () => {
    cmsQuery.usePageBySlug.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch page'),
    });

    render(<DynamicPage slug="test-page" />, { wrapper: createWrapper() });

    expect(screen.getByText('Error Loading Page')).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch page/i)).toBeInTheDocument();
  });

  it('renders not found message when page does not exist', () => {
    cmsQuery.usePageBySlug.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    render(<DynamicPage slug="non-existent" />, { wrapper: createWrapper() });

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders not available message for unpublished pages', () => {
    const mockPage = {
      page: {
        id: '1',
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
        sections: [],
      },
    };

    cmsQuery.usePageBySlug.mockReturnValue({
      data: mockPage,
      isLoading: false,
      error: null,
    });

    render(<DynamicPage slug="draft-page" />, { wrapper: createWrapper() });

    expect(screen.getByText('Page Not Available')).toBeInTheDocument();
    expect(screen.getByText(/currently not published/i)).toBeInTheDocument();
  });

  it('renders empty state when page has no sections', () => {
    const mockPage = {
      page: {
        id: '1',
        slug: 'empty-page',
        title: 'Empty Page',
        status: 'published',
        sections: [],
      },
    };

    cmsQuery.usePageBySlug.mockReturnValue({
      data: mockPage,
      isLoading: false,
      error: null,
    });

    render(<DynamicPage slug="empty-page" />, { wrapper: createWrapper() });

    expect(screen.getByText('No Content')).toBeInTheDocument();
  });

  it('renders sections in correct order', async () => {
    const mockPage = {
      page: {
        id: '1',
        slug: 'ordered-page',
        title: 'Ordered Page',
        status: 'published',
        sections: [
          {
            id: 'section-2',
            type: 'text',
            name: 'Second Section',
            order: 2,
            enabled: true,
            content: { title: 'Second' },
            settings: {},
          },
          {
            id: 'section-1',
            type: 'text',
            name: 'First Section',
            order: 1,
            enabled: true,
            content: { title: 'First' },
            settings: {},
          },
          {
            id: 'section-3',
            type: 'text',
            name: 'Third Section',
            order: 3,
            enabled: true,
            content: { title: 'Third' },
            settings: {},
          },
        ],
      },
    };

    cmsQuery.usePageBySlug.mockReturnValue({
      data: mockPage,
      isLoading: false,
      error: null,
    });

    render(<DynamicPage slug="ordered-page" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const sections = screen.getAllByText(/First|Second|Third/);
      expect(sections[0]).toHaveTextContent('First');
      expect(sections[1]).toHaveTextContent('Second');
      expect(sections[2]).toHaveTextContent('Third');
    });
  });

  it('skips disabled sections', async () => {
    const mockPage = {
      page: {
        id: '1',
        slug: 'disabled-section-page',
        title: 'Page with Disabled Section',
        status: 'published',
        sections: [
          {
            id: 'section-1',
            type: 'text',
            name: 'Enabled Section',
            order: 1,
            enabled: true,
            content: { title: 'Visible' },
            settings: {},
          },
          {
            id: 'section-2',
            type: 'text',
            name: 'Disabled Section',
            order: 2,
            enabled: false,
            content: { title: 'Hidden' },
            settings: {},
          },
        ],
      },
    };

    cmsQuery.usePageBySlug.mockReturnValue({
      data: mockPage,
      isLoading: false,
      error: null,
    });

    render(<DynamicPage slug="disabled-section-page" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Visible')).toBeInTheDocument();
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
  });
});
