import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SectionRenderer, { SectionList } from './SectionRenderer';

const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe('SectionRenderer', () => {
  const mockHeroSection = {
    id: 'hero-1',
    type: 'hero',
    name: 'Hero Section',
    enabled: true,
    content: {
      heading: 'Welcome',
      alignment: 'center',
      height: 'full',
    },
    settings: {},
  };

  const mockFeaturesSection = {
    id: 'features-1',
    type: 'features',
    name: 'Features Section',
    enabled: true,
    content: {
      heading: 'Our Features',
      features: [
        { title: 'Feature 1', description: 'Description 1' },
      ],
      layout: 'grid',
      columns: 3,
    },
  };

  it('should render hero section', () => {
    render(<SectionRenderer section={mockHeroSection} />, { wrapper });
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('should render features section', () => {
    render(<SectionRenderer section={mockFeaturesSection} />, { wrapper });
    expect(screen.getByText('Our Features')).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading is true', () => {
    const { container } = render(
      <SectionRenderer section={mockHeroSection} isLoading={true} />,
      { wrapper }
    );
    // Skeleton should be rendered
    expect(container.querySelector('[class*="MuiSkeleton"]')).toBeInTheDocument();
  });

  it('should show warning when section is null', () => {
    render(<SectionRenderer section={null} />, { wrapper });
    expect(screen.getByText('Missing Section Data')).toBeInTheDocument();
    expect(screen.getByText('No section data provided')).toBeInTheDocument();
  });

  it('should not render when section is disabled', () => {
    const disabledSection = {
      ...mockHeroSection,
      enabled: false,
    };

    const { container } = render(<SectionRenderer section={disabledSection} />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('should show warning for unknown section type', () => {
    const unknownSection = {
      id: 'unknown-1',
      type: 'unknown-type',
      name: 'Unknown Section',
      enabled: true,
      content: {},
    };

    render(<SectionRenderer section={unknownSection} />, { wrapper });
    expect(screen.getByText('Unknown Section Type')).toBeInTheDocument();
    expect(screen.getByText(/unknown-type/)).toBeInTheDocument();
  });

  it('should handle rendering errors with error boundary', () => {
    // Mock console.error to avoid noise in test output
    const originalError = console.error;
    console.error = jest.fn();

    const errorSection = {
      id: 'error-1',
      type: 'hero',
      name: 'Error Section',
      enabled: true,
      content: null, // This will cause an error
    };

    render(<SectionRenderer section={errorSection} />, { wrapper });

    // Error boundary should catch the error
    expect(screen.getByText('Section Rendering Error')).toBeInTheDocument();

    console.error = originalError;
  });

  it('should show error details when showErrorDetails is true', () => {
    const originalError = console.error;
    console.error = jest.fn();

    const errorSection = {
      id: 'error-1',
      type: 'hero',
      name: 'Error Section',
      enabled: true,
      content: null,
    };

    render(
      <SectionRenderer section={errorSection} showErrorDetails={true} />,
      { wrapper }
    );

    expect(screen.getByText('Section Rendering Error')).toBeInTheDocument();

    console.error = originalError;
  });

  it('should call onError callback when error occurs', () => {
    const originalError = console.error;
    console.error = jest.fn();

    const onError = jest.fn();
    const errorSection = {
      id: 'error-1',
      type: 'hero',
      name: 'Error Section',
      enabled: true,
      content: null,
    };

    render(
      <SectionRenderer section={errorSection} onError={onError} />,
      { wrapper }
    );

    // onError should have been called
    expect(onError).toHaveBeenCalled();

    console.error = originalError;
  });

  it('should apply custom sx styles', () => {
    const { container } = render(
      <SectionRenderer section={mockHeroSection} sx={{ backgroundColor: 'red' }} />,
      { wrapper }
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render testimonials section', () => {
    const testimonialsSection = {
      id: 'testimonials-1',
      type: 'testimonials',
      name: 'Testimonials',
      enabled: true,
      content: {
        heading: 'Customer Reviews',
        testimonials: [
          {
            name: 'John Doe',
            role: 'CEO',
            company: 'Tech Corp',
            content: 'Great product!',
            rating: 5,
          },
        ],
        layout: 'grid',
        showRatings: true,
      },
    };

    render(<SectionRenderer section={testimonialsSection} />, { wrapper });
    expect(screen.getByText('Customer Reviews')).toBeInTheDocument();
  });

  it('should render gallery section', () => {
    const gallerySection = {
      id: 'gallery-1',
      type: 'gallery',
      name: 'Gallery',
      enabled: true,
      content: {
        heading: 'Photo Gallery',
        images: ['https://example.com/image1.jpg'],
        layout: 'grid',
        columns: 3,
        aspectRatio: '1/1',
      },
    };

    render(<SectionRenderer section={gallerySection} />, { wrapper });
    expect(screen.getByText('Photo Gallery')).toBeInTheDocument();
  });

  it('should render CTA section', () => {
    const ctaSection = {
      id: 'cta-1',
      type: 'cta',
      name: 'CTA',
      enabled: true,
      content: {
        heading: 'Get Started Today',
        description: 'Join us now',
        alignment: 'center',
        buttons: [],
      },
    };

    render(<SectionRenderer section={ctaSection} />, { wrapper });
    expect(screen.getByText('Get Started Today')).toBeInTheDocument();
  });

  it('should render text section', () => {
    const textSection = {
      id: 'text-1',
      type: 'text',
      name: 'Text',
      enabled: true,
      content: {
        heading: 'About Us',
        content: 'We are a great company.',
        alignment: 'left',
      },
    };

    render(<SectionRenderer section={textSection} />, { wrapper });
    expect(screen.getByText('About Us')).toBeInTheDocument();
  });
});

describe('SectionList', () => {
  const mockSections = [
    {
      id: 'hero-1',
      type: 'hero',
      name: 'Hero',
      order: 1,
      enabled: true,
      content: {
        heading: 'Welcome',
        alignment: 'center',
        height: 'full',
      },
    },
    {
      id: 'features-1',
      type: 'features',
      name: 'Features',
      order: 2,
      enabled: true,
      content: {
        heading: 'Our Features',
        features: [{ title: 'Feature 1', description: 'Desc 1' }],
        layout: 'grid',
        columns: 3,
      },
    },
    {
      id: 'cta-1',
      type: 'cta',
      name: 'CTA',
      order: 3,
      enabled: true,
      content: {
        heading: 'Get Started',
        alignment: 'center',
        buttons: [],
      },
    },
  ];

  it('should render all sections in order', () => {
    render(<SectionList sections={mockSections} />, { wrapper });

    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Our Features')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('should sort sections by order', () => {
    const unorderedSections = [
      { ...mockSections[2], order: 1 },
      { ...mockSections[0], order: 3 },
      { ...mockSections[1], order: 2 },
    ];

    render(<SectionList sections={unorderedSections} />, { wrapper });

    // All sections should still render
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Our Features')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('should show loading skeletons when isLoading is true', () => {
    const { container } = render(
      <SectionList sections={mockSections} isLoading={true} />,
      { wrapper }
    );

    const skeletons = container.querySelectorAll('[class*="MuiSkeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show message when sections array is empty', () => {
    render(<SectionList sections={[]} />, { wrapper });

    expect(screen.getByText('No Content')).toBeInTheDocument();
    expect(screen.getByText('No sections available for this page')).toBeInTheDocument();
  });

  it('should show message when sections is null', () => {
    render(<SectionList sections={null} />, { wrapper });

    expect(screen.getByText('No Content')).toBeInTheDocument();
  });

  it('should skip disabled sections', () => {
    const sectionsWithDisabled = [
      mockSections[0],
      { ...mockSections[1], enabled: false },
      mockSections[2],
    ];

    render(<SectionList sections={sectionsWithDisabled} />, { wrapper });

    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.queryByText('Our Features')).not.toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('should handle errors in individual sections', () => {
    const originalError = console.error;
    console.error = jest.fn();

    const sectionsWithError = [
      mockSections[0],
      {
        id: 'error-1',
        type: 'hero',
        name: 'Error Section',
        order: 2,
        enabled: true,
        content: null,
      },
      mockSections[2],
    ];

    render(<SectionList sections={sectionsWithError} />, { wrapper });

    // First and third sections should render
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();

    // Error section should show error message
    expect(screen.getByText('Section Rendering Error')).toBeInTheDocument();

    console.error = originalError;
  });

  it('should apply custom sx styles', () => {
    const { container } = render(
      <SectionList sections={mockSections} sx={{ padding: 2 }} />,
      { wrapper }
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should call onError for each section error', () => {
    const originalError = console.error;
    console.error = jest.fn();

    const onError = jest.fn();
    const sectionsWithError = [
      {
        id: 'error-1',
        type: 'hero',
        name: 'Error Section',
        order: 1,
        enabled: true,
        content: null,
      },
    ];

    render(
      <SectionList sections={sectionsWithError} onError={onError} />,
      { wrapper }
    );

    expect(onError).toHaveBeenCalled();

    console.error = originalError;
  });
});
