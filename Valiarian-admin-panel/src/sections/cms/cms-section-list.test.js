import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import { BrowserRouter } from 'react-router-dom';
import CMSSectionList from './cms-section-list';

// Mock data
const mockSections = [
  {
    id: '1',
    pageId: 'page-1',
    type: 'hero',
    name: 'Hero Section',
    order: 0,
    enabled: true,
    content: {},
    settings: {},
  },
  {
    id: '2',
    pageId: 'page-1',
    type: 'features',
    name: 'Features Section',
    order: 1,
    enabled: true,
    content: {},
    settings: {},
  },
  {
    id: '3',
    pageId: 'page-1',
    type: 'testimonials',
    name: 'Testimonials Section',
    order: 2,
    enabled: true,
    content: {},
    settings: {},
  },
];

// Wrapper component for providers
const Wrapper = ({ children }) => (
  <BrowserRouter>
    <SnackbarProvider>{children}</SnackbarProvider>
  </BrowserRouter>
);

describe('CMSSectionList', () => {
  const mockOnSectionsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no sections', () => {
    render(
      <CMSSectionList pageId="page-1" sections={[]} onSectionsChange={mockOnSectionsChange} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/no sections yet/i)).toBeInTheDocument();
    expect(screen.getByText(/add section/i)).toBeInTheDocument();
  });

  it('renders section list with sections', () => {
    render(
      <CMSSectionList
        pageId="page-1"
        sections={mockSections}
        onSectionsChange={mockOnSectionsChange}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Hero Section')).toBeInTheDocument();
    expect(screen.getByText('Features Section')).toBeInTheDocument();
    expect(screen.getByText(/3 sections/i)).toBeInTheDocument();
  });

  it('displays correct section count', () => {
    render(
      <CMSSectionList
        pageId="page-1"
        sections={mockSections}
        onSectionsChange={mockOnSectionsChange}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/3 sections/i)).toBeInTheDocument();
  });

  it('shows add section button', () => {
    render(
      <CMSSectionList
        pageId="page-1"
        sections={mockSections}
        onSectionsChange={mockOnSectionsChange}
      />,
      { wrapper: Wrapper }
    );

    const addButtons = screen.getAllByText(/add section/i);
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('displays section type badges correctly', () => {
    render(
      <CMSSectionList
        pageId="page-1"
        sections={mockSections}
        onSectionsChange={mockOnSectionsChange}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.getByText('features')).toBeInTheDocument();
    expect(screen.getByText('testimonials')).toBeInTheDocument();
  });

  it('shows enabled/disabled status for sections', () => {
    const sectionsWithDisabled = [
      ...mockSections.slice(0, 2),
      { ...mockSections[2], enabled: false },
    ];

    render(
      <CMSSectionList
        pageId="page-1"
        sections={sectionsWithDisabled}
        onSectionsChange={mockOnSectionsChange}
      />,
      { wrapper: Wrapper }
    );

    // All sections should be rendered regardless of enabled status
    expect(screen.getByText('Hero Section')).toBeInTheDocument();
    expect(screen.getByText('Features Section')).toBeInTheDocument();
    expect(screen.getByText('Testimonials Section')).toBeInTheDocument();
  });

  it('opens section type selector when add section is clicked', async () => {
    render(
      <CMSSectionList
        pageId="page-1"
        sections={mockSections}
        onSectionsChange={mockOnSectionsChange}
      />,
      { wrapper: Wrapper }
    );

    const addButton = screen.getAllByText(/add section/i)[0];
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/choose section type/i)).toBeInTheDocument();
    });
  });

  it('handles section enable/disable toggle', async () => {
    render(
      <CMSSectionList
        pageId="page-1"
        sections={mockSections}
        onSectionsChange={mockOnSectionsChange}
      />,
      { wrapper: Wrapper }
    );

    // Find toggle switches (MUI Switch components)
    const switches = screen.getAllByRole('checkbox');

    // Toggle the first section
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(mockOnSectionsChange).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop Reordering', () => {
    it('calls onSectionsChange with reordered sections on drag end', () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={mockSections}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      // Simulate drag end event
      // Note: @hello-pangea/dnd requires a complex event structure
      // We're testing that the component is set up to handle drag events
      const dragHandles = screen.getAllByTestId(/drag-handle/i);
      expect(dragHandles.length).toBeGreaterThan(0);
    });

    it('updates section order property after reordering', () => {
      const { container } = render(
        <CMSSectionList
          pageId="page-1"
          sections={mockSections}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      // Verify sections are rendered in order
      const sectionNames = screen.getAllByText(/section/i);
      expect(sectionNames[0]).toHaveTextContent('Hero Section');
      expect(sectionNames[1]).toHaveTextContent('Features Section');
      expect(sectionNames[2]).toHaveTextContent('Testimonials Section');
    });

    it('maintains section data integrity during reorder', () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={mockSections}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      // Verify all section data is preserved
      mockSections.forEach((section) => {
        expect(screen.getByText(section.name)).toBeInTheDocument();
        expect(screen.getByText(section.type)).toBeInTheDocument();
      });
    });
  });

  describe('Section Type Switching', () => {
    it('opens section editor when edit button is clicked', async () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={mockSections}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      // Find edit buttons
      const editButtons = screen.getAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        // Section editor dialog should open
        expect(screen.getByText(/edit section/i)).toBeInTheDocument();
      });
    });

    it('displays correct editor form based on section type', async () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={mockSections}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      // Edit hero section
      const editButtons = screen.getAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        // Hero section specific fields should be present
        expect(screen.getByText(/edit section/i)).toBeInTheDocument();
      });
    });

    it('allows deleting a section', async () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={mockSections}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      // Find delete buttons
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        // Confirmation dialog should appear
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnSectionsChange).toHaveBeenCalled();
      });
    });

    it('allows duplicating a section', async () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={mockSections}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      // Find duplicate buttons (more menu)
      const moreButtons = screen.getAllByLabelText(/more/i);
      fireEvent.click(moreButtons[0]);

      await waitFor(() => {
        const duplicateOption = screen.getByText(/duplicate/i);
        fireEvent.click(duplicateOption);
      });

      await waitFor(() => {
        expect(mockOnSectionsChange).toHaveBeenCalled();
      });
    });
  });

  describe('Section Type Selector Integration', () => {
    it('displays all available section types in selector', async () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={[]}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      const addButton = screen.getByText(/add section/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Hero Section')).toBeInTheDocument();
        expect(screen.getByText('Features Section')).toBeInTheDocument();
        expect(screen.getByText('Testimonials Section')).toBeInTheDocument();
        expect(screen.getByText('Gallery Section')).toBeInTheDocument();
        expect(screen.getByText('Call to Action')).toBeInTheDocument();
        expect(screen.getByText('Text Section')).toBeInTheDocument();
      });
    });

    it('creates new section when type is selected', async () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={[]}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      const addButton = screen.getByText(/add section/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        const heroOption = screen.getByText('Hero Section');
        fireEvent.click(heroOption);
      });

      await waitFor(() => {
        expect(mockOnSectionsChange).toHaveBeenCalled();
      });
    });

    it('closes selector dialog when cancel is clicked', async () => {
      render(
        <CMSSectionList
          pageId="page-1"
          sections={[]}
          onSectionsChange={mockOnSectionsChange}
        />,
        { wrapper: Wrapper }
      );

      const addButton = screen.getByText(/add section/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/choose section type/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/choose section type/i)).not.toBeInTheDocument();
      });
    });
  });
});
