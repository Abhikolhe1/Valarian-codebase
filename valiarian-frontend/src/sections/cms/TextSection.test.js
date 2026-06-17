import { render, screen } from '@testing-library/react';
import TextSection from './TextSection';

describe('TextSection', () => {
  it('renders text section with title and body', () => {
    const content = {
      title: 'About Us',
      body: '<p>We are a company dedicated to excellence.</p>',
    };
    const settings = {};

    render(<TextSection content={content} settings={settings} />);

    expect(screen.getByText('About Us')).toBeInTheDocument();
    expect(screen.getByText('We are a company dedicated to excellence.')).toBeInTheDocument();
  });

  it('renders with custom alignment', () => {
    const content = {
      title: 'Centered Text',
      body: '<p>This text is centered.</p>',
      alignment: 'center',
    };
    const settings = {};

    render(<TextSection content={content} settings={settings} />);

    expect(screen.getByText('Centered Text')).toBeInTheDocument();
  });
});
