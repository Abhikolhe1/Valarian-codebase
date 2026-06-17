import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CTASection from './CTASection';

const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe('CTASection', () => {
  const mockSection = {
    id: 'cta-1',
    type: 'cta',
    name: 'CTA Section',
    content: {
      heading: 'Ready to Get Started?',
      description: 'Join thousands of satisfied customers today',
      alignment: 'center',
      buttons: [],
    },
    settings: {},
  };

  it('should render heading and description', () => {
    render(<CTASection section={mockSection} />, { wrapper });

    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
    expect(screen.getByText('Join thousands of satisfied customers today')).toBeInTheDocument();
  });

  it('should render with background image', () => {
    const sectionWithBg = {
      ...mockSection,
      content: {
        ...mockSection.content,
        backgroundImage: 'https://example.com/cta-bg.jpg',
      },
    };

    const { container } = render(<CTASection section={sectionWithBg} />, { wrapper });
    const image = container.querySelector('img[src="https://example.com/cta-bg.jpg"]');
    expect(image).toBeInTheDocument();
  });

  it('should render with background color', () => {
    const sectionWithColor = {
      ...mockSection,
      content: {
        ...mockSection.content,
        backgroundColor: '#1976d2',
      },
    };

    render(<CTASection section={sectionWithColor} />, { wrapper });
    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
  });

  it('should render CTA buttons', () => {
    const sectionWithButtons = {
      ...mockSection,
      content: {
        ...mockSection.content,
        buttons: [
          {
            text: 'Get Started',
            url: '/signup',
            style: 'primary',
            openInNewTab: false,
          },
          {
            text: 'Learn More',
            url: '/about',
            style: 'outline',
            openInNewTab: true,
          },
        ],
      },
    };

    render(<CTASection section={sectionWithButtons} />, { wrapper });

    const getStartedButton = screen.getByText('Get Started');
    const learnMoreButton = screen.getByText('Learn More');

    expect(getStartedButton).toBeInTheDocument();
    expect(getStartedButton).toHaveAttribute('href', '/signup');
    expect(getStartedButton).not.toHaveAttribute('target', '_blank');

    expect(learnMoreButton).toBeInTheDocument();
    expect(learnMoreButton).toHaveAttribute('href', '/about');
    expect(learnMoreButton).toHaveAttribute('target', '_blank');
    expect(learnMoreButton).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render with left alignment', () => {
    const sectionLeftAlign = {
      ...mockSection,
      content: {
        ...mockSection.content,
        alignment: 'left',
      },
    };

    const { container } = render(<CTASection section={sectionLeftAlign} />, { wrapper });
    const contentContainer = container.querySelector('[style*="text-align"]');
    expect(contentContainer).toBeInTheDocument();
  });

  it('should render with right alignment', () => {
    const sectionRightAlign = {
      ...mockSection,
      content: {
        ...mockSection.content,
        alignment: 'right',
      },
    };

    const { container } = render(<CTASection section={sectionRightAlign} />, { wrapper });
    const contentContainer = container.querySelector('[style*="text-align"]');
    expect(contentContainer).toBeInTheDocument();
  });

  it('should render buttons with different styles', () => {
    const sectionWithStyles = {
      ...mockSection,
      content: {
        ...mockSection.content,
        buttons: [
          { text: 'Primary', url: '/1', style: 'primary' },
          { text: 'Secondary', url: '/2', style: 'secondary' },
          { text: 'Outline', url: '/3', style: 'outline' },
          { text: 'Text', url: '/4', style: 'text' },
        ],
      },
    };

    render(<CTASection section={sectionWithStyles} />, { wrapper });

    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
    expect(screen.getByText('Outline')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should render buttons with icons', () => {
    const sectionWithIcons = {
      ...mockSection,
      content: {
        ...mockSection.content,
        buttons: [
          {
            text: 'Shop Now',
            url: '/shop',
            style: 'primary',
            icon: 'eva:shopping-cart-fill',
          },
        ],
      },
    };

    render(<CTASection section={sectionWithIcons} />, { wrapper });
    expect(screen.getByText('Shop Now')).toBeInTheDocument();
  });

  it('should render without description', () => {
    const noDescSection = {
      ...mockSection,
      content: {
        heading: 'Simple CTA',
        alignment: 'center',
        buttons: [],
      },
    };

    render(<CTASection section={noDescSection} />, { wrapper });
    expect(screen.getByText('Simple CTA')).toBeInTheDocument();
  });

  it('should render with both background image and color', () => {
    const sectionWithBoth = {
      ...mockSection,
      content: {
        ...mockSection.content,
        backgroundImage: 'https://example.com/bg.jpg',
        backgroundColor: '#1976d2',
      },
    };

    const { container } = render(<CTASection section={sectionWithBoth} />, { wrapper });
    // Background image should take precedence
    const image = container.querySelector('img[src="https://example.com/bg.jpg"]');
    expect(image).toBeInTheDocument();
  });

  it('should handle empty buttons array', () => {
    render(<CTASection section={mockSection} />, { wrapper });
    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
  });

  it('should render multiple buttons in a row', () => {
    const multiButtonSection = {
      ...mockSection,
      content: {
        ...mockSection.content,
        buttons: [
          { text: 'Button 1', url: '/1', style: 'primary' },
          { text: 'Button 2', url: '/2', style: 'secondary' },
          { text: 'Button 3', url: '/3', style: 'outline' },
        ],
      },
    };

    render(<CTASection section={multiButtonSection} />, { wrapper });
    expect(screen.getByText('Button 1')).toBeInTheDocument();
    expect(screen.getByText('Button 2')).toBeInTheDocument();
    expect(screen.getByText('Button 3')).toBeInTheDocument();
  });
});
