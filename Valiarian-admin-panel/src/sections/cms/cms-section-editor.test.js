import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import CMSSectionEditor from './cms-section-editor';

// Mock fetch
global.fetch = jest.fn();

// Wrapper component for providers
const Wrapper = ({ children }) => <SnackbarProvider>{children}</SnackbarProvider>;

describe('CMSSectionEditor', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockPageId = 'page-123';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  describe('Dialog Rendering', () => {
    it('renders dialog when open is true', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Hero Section')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(
        <CMSSectionEditor
          open={false}
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.queryByText('Create Hero Section')).not.toBeInTheDocument();
    });

    it('displays correct title for create mode', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="features"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Features Section')).toBeInTheDocument();
    });

    it('displays correct title for edit mode', () => {
      const mockSection = {
        id: 'section-1',
        type: 'hero',
        name: 'Hero Section',
        content: {},
      };

      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          section={mockSection}
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Edit Hero Section')).toBeInTheDocument();
    });
  });

  describe('Section Type Switching', () => {
    it('renders hero section editor for hero type', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Hero Section')).toBeInTheDocument();
      // Hero editor should have specific fields
      expect(screen.getByLabelText(/section name/i)).toBeInTheDocument();
    });

    it('renders features section editor for features type', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="features"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Features Section')).toBeInTheDocument();
    });

    it('renders testimonials section editor for testimonials type', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="testimonials"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Testimonials Section')).toBeInTheDocument();
    });

    it('renders gallery section editor for gallery type', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="gallery"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Gallery Section')).toBeInTheDocument();
    });

    it('renders CTA section editor for cta type', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="cta"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Call to Action Section')).toBeInTheDocument();
    });

    it('renders text section editor for text type', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="text"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Create Text Section')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      const closeButtons = screen.getAllByRole('button');
      const closeIconButton = closeButtons.find((button) => button.querySelector('svg'));

      if (closeIconButton) {
        fireEvent.click(closeIconButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when cancel button is clicked', async () => {
      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Save Functionality', () => {
    it('creates new section when save is clicked in create mode', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-section-id',
          type: 'hero',
          name: 'New Hero Section',
          pageId: mockPageId,
        }),
      });

      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      // Fill in section name
      const nameInput = screen.getByLabelText(/section name/i);
      fireEvent.change(nameInput, { target: { value: 'New Hero Section' } });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3035/api/cms/sections',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );
      });
    });

    it('updates existing section when save is clicked in edit mode', async () => {
      const mockSection = {
        id: 'section-1',
        type: 'hero',
        name: 'Existing Hero Section',
        content: {},
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSection,
          name: 'Updated Hero Section',
        }),
      });

      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          section={mockSection}
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      // Update section name
      const nameInput = screen.getByLabelText(/section name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Hero Section' } });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `http://localhost:3035/api/cms/sections/${mockSection.id}`,
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    it('calls onSave callback after successful save', async () => {
      const savedSection = {
        id: 'new-section-id',
        type: 'hero',
        name: 'New Hero Section',
        pageId: mockPageId,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => savedSection,
      });

      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      const nameInput = screen.getByLabelText(/section name/i);
      fireEvent.change(nameInput, { target: { value: 'New Hero Section' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(savedSection);
      });
    });

    it('closes dialog after successful save', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-section-id',
          type: 'hero',
          name: 'New Hero Section',
        }),
      });

      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      const nameInput = screen.getByLabelText(/section name/i);
      fireEvent.change(nameInput, { target: { value: 'New Hero Section' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('displays error message when save fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <CMSSectionEditor
          open
          onClose={mockOnClose}
          sectionType="hero"
          pageId={mockPageId}
          onSave={mockOnSave}
        />,
        { wrapper: Wrapper }
      );

      const nameInput = screen.getByLabelText(/section name/i);
      fireEvent.change(nameInput, { target: { value: 'New Hero Section' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save section/i)).toBeInTheDocument();
      });
    });
  });
});
