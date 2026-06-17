import { render, screen } from '@testing-library/react';
import HeroSection from './HeroSection';

describe('HeroSection', () => {
  it('renders hero section with title and subtitle', () => {
    const content = {
      title: 'Welcome to Our Platform',
      subtitle: 'Build amazing experiences',
    };
    const settings = {};

    render(<HeroSection content={content} settings={settings} />);

    expect(screen.getByText('Welcome to Our Platform')).toBeInTheDocument();
    expect(screen.getByText('Build amazing experiences')).toBeInTheDocument();
  });

  it('renders with CTA buttons', () => {
    const content = {
      title: 'Get Started Today',
      primaryCTA: { text: 'Sign Up', url: '/signup' },
      secondaryCTA: { text: 'Learn More', url: '/about' },
    };
    const settings = {};

    render(<HeroSection content={content} settings={settings} />);

    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });

  it('renders with background image', () => {
    const content = {
      title: 'Hero with Background',
      backgroundImage: 'https://example.com/hero.jpg',
    };
    const settings = {};

    const { container } = render(<HeroSection content={content} settings={settings} />);
    const box = container.querySelector('[style*="background"]');
    expect(box).toBeInTheDocument();
  });
});
