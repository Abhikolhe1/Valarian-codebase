import { render, screen } from '@testing-library/react';
import FeaturesSection from './FeaturesSection';

describe('FeaturesSection', () => {
  it('renders features section with title', () => {
    const content = {
      title: 'Our Features',
      features: [
        {
          icon: '🚀',
          title: 'Fast Performance',
          description: 'Lightning-fast load times',
        },
      ],
    };
    const settings = {};

    render(<FeaturesSection content={content} settings={settings} />);

    expect(screen.getByText('Our Features')).toBeInTheDocument();
    expect(screen.getByText('Fast Performance')).toBeInTheDocument();
    expect(screen.getByText('Lightning-fast load times')).toBeInTheDocument();
  });

  it('renders multiple features in a grid', () => {
    const content = {
      features: [
        { title: 'Feature 1', description: 'Description 1' },
        { title: 'Feature 2', description: 'Description 2' },
        { title: 'Feature 3', description: 'Description 3' },
      ],
    };
    const settings = { columns: 3 };

    render(<FeaturesSection content={content} settings={settings} />);

    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
    expect(screen.getByText('Feature 3')).toBeInTheDocument();
  });
});
