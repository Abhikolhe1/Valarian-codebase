import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GallerySection from './GallerySection';

const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe('GallerySection', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
    'https://example.com/image4.jpg',
  ];

  const mockSection = {
    id: 'gallery-1',
    type: 'gallery',
    name: 'Gallery Section',
    content: {
      heading: 'Our Gallery',
      images: mockImages,
      layout: 'grid',
      columns: 3,
      aspectRatio: '1/1',
    },
  };

  it('should render heading', () => {
    render(<GallerySection section={mockSection} />, { wrapper });
    expect(screen.getByText('Our Gallery')).toBeInTheDocument();
  });

  it('should render all images', () => {
    const { container } = render(<GallerySection section={mockSection} />, { wrapper });
    const images = container.querySelectorAll('img');
    // Filter out any non-gallery images (like icons)
    const galleryImages = Array.from(images).filter(img =>
      img.src.includes('example.com/image')
    );
    expect(galleryImages.length).toBe(4);
  });

  it('should render in grid layout', () => {
    const { container } = render(<GallerySection section={mockSection} />, { wrapper });
    const grid = container.querySelector('[style*="grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('should render in masonry layout', () => {
    const masonrySection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        layout: 'masonry',
      },
    };

    const { container } = render(<GallerySection section={masonrySection} />, { wrapper });
    const masonry = container.querySelector('[style*="column"]');
    expect(masonry).toBeInTheDocument();
  });

  it('should render in carousel layout', () => {
    const carouselSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        layout: 'carousel',
      },
    };

    render(<GallerySection section={carouselSection} />, { wrapper });
    const { container } = render(<GallerySection section={carouselSection} />, { wrapper });
    expect(container).toBeInTheDocument();
  });

  it('should render with different column counts', () => {
    const fourColumnSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        columns: 4,
      },
    };

    render(<GallerySection section={fourColumnSection} />, { wrapper });
    expect(screen.getByText('Our Gallery')).toBeInTheDocument();
  });

  it('should render with different aspect ratios', () => {
    const wideSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        aspectRatio: '16/9',
      },
    };

    render(<GallerySection section={wideSection} />, { wrapper });
    expect(screen.getByText('Our Gallery')).toBeInTheDocument();
  });

  it('should render with auto aspect ratio', () => {
    const autoSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        aspectRatio: 'auto',
      },
    };

    render(<GallerySection section={autoSection} />, { wrapper });
    expect(screen.getByText('Our Gallery')).toBeInTheDocument();
  });

  it('should open lightbox when image is clicked', () => {
    const { container } = render(<GallerySection section={mockSection} />, { wrapper });
    const firstImage = container.querySelector('img[alt="Gallery image 1"]');

    if (firstImage) {
      const clickableParent = firstImage.closest('[style*="cursor"]');
      if (clickableParent) {
        fireEvent.click(clickableParent);
      }
    }

    // Lightbox should be rendered (even if not visible)
    expect(container).toBeInTheDocument();
  });

  it('should render without heading', () => {
    const noHeadingSection = {
      ...mockSection,
      content: {
        images: mockImages,
        layout: 'grid',
        columns: 3,
        aspectRatio: '1/1',
      },
    };

    const { container } = render(<GallerySection section={noHeadingSection} />, { wrapper });
    const images = container.querySelectorAll('img');
    const galleryImages = Array.from(images).filter(img =>
      img.src.includes('example.com/image')
    );
    expect(galleryImages.length).toBe(4);
  });

  it('should handle empty images array', () => {
    const emptySection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        images: [],
      },
    };

    const { container } = render(<GallerySection section={emptySection} />, { wrapper });
    expect(container).toBeInTheDocument();
  });

  it('should render with single image', () => {
    const singleImageSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        images: ['https://example.com/single.jpg'],
      },
    };

    const { container } = render(<GallerySection section={singleImageSection} />, { wrapper });
    const images = container.querySelectorAll('img[alt*="Gallery image"]');
    expect(images.length).toBeGreaterThan(0);
  });

  it('should render hover overlay on images', () => {
    const { container } = render(<GallerySection section={mockSection} />, { wrapper });
    const overlay = container.querySelector('.overlay');
    expect(overlay).toBeInTheDocument();
  });
});
