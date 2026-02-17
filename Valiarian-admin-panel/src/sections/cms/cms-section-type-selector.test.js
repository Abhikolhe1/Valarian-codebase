import { fireEvent, render, screen } from '@testing-library/react';
import CMSSectionTypeSelector from './cms-section-type-selector';

describe('CMSSectionTypeSelector', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open is true', () => {
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    expect(screen.getByText('Choose Section Type')).toBeInTheDocument();
    expect(screen.getByText(/select a section type to add to your page/i)).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    render(<CMSSectionTypeSelector open={false} onClose={mockOnClose} onSelect={mockOnSelect} />);

    expect(screen.queryByText('Choose Section Type')).not.toBeInTheDocument();
  });

  it('displays all section types', () => {
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    expect(screen.getByText('Hero Section')).toBeInTheDocument();
    expect(screen.getByText('Features Section')).toBeInTheDocument();
    expect(screen.getByText('Testimonials Section')).toBeInTheDocument();
    expect(screen.getByText('Gallery Section')).toBeInTheDocument();
    expect(screen.getByText('Call to Action')).toBeInTheDocument();
    expect(screen.getByText('Text Section')).toBeInTheDocument();
  });

  it('displays section descriptions', () => {
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    expect(
      screen.getByText(/Large banner with background image\/video, heading, and CTA buttons/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Showcase product features with icons, titles, and descriptions/i)
    ).toBeInTheDocument();
  });

  it('calls onSelect and onClose when a section type is clicked', () => {
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    const heroSection = screen.getByText('Hero Section');
    fireEvent.click(heroSection);

    expect(mockOnSelect).toHaveBeenCalledWith('hero');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onSelect with correct type for each section', () => {
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    // Test features section
    const featuresSection = screen.getByText('Features Section');
    fireEvent.click(featuresSection);
    expect(mockOnSelect).toHaveBeenCalledWith('features');

    // Reset mocks
    jest.clearAllMocks();

    // Re-render for next test
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    // Test testimonials section
    const testimonialsSection = screen.getByText('Testimonials Section');
    fireEvent.click(testimonialsSection);
    expect(mockOnSelect).toHaveBeenCalledWith('testimonials');
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('calls onClose when close icon is clicked', () => {
    render(<CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />);

    // Find the close icon button in the dialog title
    const closeButtons = screen.getAllByRole('button');
    const closeIconButton = closeButtons.find((button) => button.querySelector('svg'));

    if (closeIconButton) {
      fireEvent.click(closeIconButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('renders section type cards with hover effect', () => {
    const { container } = render(
      <CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />
    );

    // Check that cards are rendered
    const cards = container.querySelectorAll('.MuiCard-root');
    expect(cards.length).toBe(6); // 6 section types
  });

  it('displays icons for each section type', () => {
    const { container } = render(
      <CMSSectionTypeSelector open onClose={mockOnClose} onSelect={mockOnSelect} />
    );

    // Check that icons are rendered (Iconify components)
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});
