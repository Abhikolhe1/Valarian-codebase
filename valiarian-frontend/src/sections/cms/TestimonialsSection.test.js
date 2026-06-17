import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TestimonialsSection from './TestimonialsSection';

const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe('TestimonialsSection', () => {
  const mockTestimonials = [
    {
      name: 'John Doe',
      role: 'CEO',
      company: 'Tech Corp',
      avatar: 'https://example.com/avatar1.jpg',
      content: 'Excellent service and quality products!',
      rating: 5,
    },
    {
      name: 'Jane Smith',
      role: 'Designer',
      company: 'Creative Studio',
      content: 'Love the attention to detail and craftsmanship.',
      rating: 4,
    },
    {
      name: 'Bob Johnson',
      role: 'Manager',
      company: 'Business Inc',
      avatar: 'https://example.com/avatar3.jpg',
      content: 'Fast delivery and great customer support.',
      rating: 5,
    },
  ];

  const mockSection = {
    id: 'testimonials-1',
    type: 'testimonials',
    name: 'Testimonials Section',
    content: {
      heading: 'What Our Customers Say',
      testimonials: mockTestimonials,
      layout: 'grid',
      showRatings: true,
    },
  };

  it('should render heading', () => {
    render(<TestimonialsSection section={mockSection} />, { wrapper });
    expect(screen.getByText('What Our Customers Say')).toBeInTheDocument();
  });

  it('should render all testimonials', () => {
    render(<TestimonialsSection section={mockSection} />, { wrapper });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should render testimonial content', () => {
    render(<TestimonialsSection section={mockSection} />, { wrapper });

    expect(screen.getByText(/"Excellent service and quality products!"/)).toBeInTheDocument();
    expect(screen.getByText(/"Love the attention to detail and craftsmanship."/)).toBeInTheDocument();
  });

  it('should render author details', () => {
    render(<TestimonialsSection section={mockSection} />, { wrapper });

    expect(screen.getByText('CEO at Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Designer at Creative Studio')).toBeInTheDocument();
    expect(screen.getByText('Manager at Business Inc')).toBeInTheDocument();
  });

  it('should render ratings when showRatings is true', () => {
    const { container } = render(<TestimonialsSection section={mockSection} />, { wrapper });
    const ratings = container.querySelectorAll('[class*="MuiRating"]');
    expect(ratings.length).toBeGreaterThan(0);
  });

  it('should not render ratings when showRatings is false', () => {
    const noRatingsSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        showRatings: false,
      },
    };

    const { container } = render(<TestimonialsSection section={noRatingsSection} />, { wrapper });
    const ratings = container.querySelectorAll('[class*="MuiRating"]');
    expect(ratings.length).toBe(0);
  });

  it('should render in grid layout', () => {
    const { container } = render(<TestimonialsSection section={mockSection} />, { wrapper });
    const grid = container.querySelector('[style*="grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('should render in carousel layout', () => {
    const carouselSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        layout: 'carousel',
      },
    };

    render(<TestimonialsSection section={carouselSection} />, { wrapper });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render in masonry layout', () => {
    const masonrySection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        layout: 'masonry',
      },
    };

    const { container } = render(<TestimonialsSection section={masonrySection} />, { wrapper });
    const masonry = container.querySelector('[style*="column"]');
    expect(masonry).toBeInTheDocument();
  });

  it('should render avatars when provided', () => {
    const { container } = render(<TestimonialsSection section={mockSection} />, { wrapper });
    const avatar1 = container.querySelector('img[src="https://example.com/avatar1.jpg"]');
    const avatar3 = container.querySelector('img[src="https://example.com/avatar3.jpg"]');

    expect(avatar1).toBeInTheDocument();
    expect(avatar3).toBeInTheDocument();
  });

  it('should render initials when avatar is not provided', () => {
    render(<TestimonialsSection section={mockSection} />, { wrapper });
    // Jane Smith has no avatar, so should show initial 'J'
    const avatars = screen.getAllByText('J');
    expect(avatars.length).toBeGreaterThan(0);
  });

  it('should render without heading', () => {
    const noHeadingSection = {
      ...mockSection,
      content: {
        testimonials: mockTestimonials,
        layout: 'grid',
        showRatings: true,
      },
    };

    render(<TestimonialsSection section={noHeadingSection} />, { wrapper });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should handle empty testimonials array', () => {
    const emptySection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        testimonials: [],
      },
    };

    const { container } = render(<TestimonialsSection section={emptySection} />, { wrapper });
    expect(container).toBeInTheDocument();
  });

  it('should render testimonials without ratings', () => {
    const noRatingTestimonials = {
      ...mockSection,
      content: {
        ...mockSection.content,
        testimonials: [
          {
            name: 'Test User',
            role: 'Tester',
            company: 'Test Co',
            content: 'Great product!',
          },
        ],
      },
    };

    render(<TestimonialsSection section={noRatingTestimonials} />, { wrapper });
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
