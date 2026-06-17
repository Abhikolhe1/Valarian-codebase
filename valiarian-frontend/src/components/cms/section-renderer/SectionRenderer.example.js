/**
 * SectionRenderer Usage Examples
 *
 * This file demonstrates various ways to use the SectionRenderer component
 */

import { SectionList, SectionRenderer } from './index';

// ============================================================================
// Example 1: Basic Section Rendering
// ============================================================================

export function Example1_BasicSection() {
  const section = {
    id: '123',
    type: 'hero',
    name: 'Homepage Hero',
    order: 1,
    enabled: true,
    content: {
      heading: 'Welcome to Valiarian',
      subheading: 'Premium Fashion for Everyone',
      description: 'Discover our latest collection',
      backgroundImage: '/assets/images/hero-bg.jpg',
      ctaButtons: [
        {
          text: 'Shop Now',
          url: '/products',
          style: 'primary',
          openInNewTab: false,
        },
      ],
    },
  };

  return <SectionRenderer section={section} />;
}

// ============================================================================
// Example 2: Section with Loading State
// ============================================================================

export function Example2_LoadingSection() {
  const isLoading = true;
  const section = {
    id: '123',
    type: 'features',
    name: 'Features Section',
    order: 2,
    enabled: true,
    content: {},
  };

  return <SectionRenderer section={section} isLoading={isLoading} />;
}

// ============================================================================
// Example 3: Section with Error Handling
// ============================================================================

export function Example3_ErrorHandling() {
  const sectionData = {
    id: '123',
    type: 'testimonials',
    name: 'Customer Reviews',
    order: 3,
    enabled: true,
    content: {
      testimonials: [],
    },
  };

  const handleError = (error, errorInfo, sectionInfo) => {
    console.error('Section rendering failed:', {
      error: error?.error?.message,
      section: sectionInfo.name,
      errorInfo,
    });

    // Send to error tracking service
    // window.Sentry?.captureException(error);
  };

  return (
    <SectionRenderer
      section={sectionData}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={handleError}
    />
  );
}

// ============================================================================
// Example 4: Rendering Multiple Sections
// ============================================================================

export function Example4_MultipleSections() {
  const sections = [
    {
      id: '1',
      type: 'hero',
      name: 'Hero Section',
      order: 1,
      enabled: true,
      content: {
        heading: 'Welcome',
      },
    },
    {
      id: '2',
      type: 'features',
      name: 'Features',
      order: 2,
      enabled: true,
      content: {
        features: [],
      },
    },
    {
      id: '3',
      type: 'cta',
      name: 'Call to Action',
      order: 3,
      enabled: true,
      content: {
        heading: 'Get Started Today',
      },
    },
  ];

  return <SectionList sections={sections} />;
}

// ============================================================================
// Example 5: With React Query Integration
// ============================================================================

export function Example5_ReactQuery() {
  // This would typically use the usePageBySlug hook
  const mockData = {
    page: {
      id: 'page-1',
      slug: 'home',
      title: 'Home Page',
      sections: [
        {
          id: '1',
          type: 'hero',
          name: 'Hero',
          order: 1,
          enabled: true,
          content: {},
        },
        {
          id: '2',
          type: 'features',
          name: 'Features',
          order: 2,
          enabled: true,
          content: {},
        },
      ],
    },
  };

  const isLoading = false;

  return (
    <SectionList
      sections={mockData.page.sections}
      isLoading={isLoading}
      showErrorDetails={false}
    />
  );
}

// ============================================================================
// Example 6: Disabled Section (Won't Render)
// ============================================================================

export function Example6_DisabledSection() {
  const section = {
    id: '123',
    type: 'gallery',
    name: 'Photo Gallery',
    order: 4,
    enabled: false, // This section won't render
    content: {
      images: [],
    },
  };

  return <SectionRenderer section={section} />;
}

// ============================================================================
// Example 7: Unknown Section Type
// ============================================================================

export function Example7_UnknownType() {
  const section = {
    id: '123',
    type: 'unknown-type',
    name: 'Unknown Section',
    order: 5,
    enabled: true,
    content: {},
  };

  // This will show a warning message
  return <SectionRenderer section={section} />;
}

// ============================================================================
// Example 8: Empty Sections List
// ============================================================================

export function Example8_EmptySections() {
  const sections = [];

  // This will show an info message
  return <SectionList sections={sections} />;
}

// ============================================================================
// Example 9: Custom Styling
// ============================================================================

export function Example9_CustomStyling() {
  const section = {
    id: '123',
    type: 'text',
    name: 'Text Content',
    order: 6,
    enabled: true,
    content: {
      heading: 'About Us',
      content: '<p>This is our story...</p>',
    },
  };

  return (
    <SectionRenderer
      section={section}
      sx={{
        bgcolor: 'background.paper',
        py: 8,
        borderRadius: 2,
      }}
    />
  );
}

// ============================================================================
// Example 10: Complete Page with All Features
// ============================================================================

export function Example10_CompletePage() {
  const sections = [
    {
      id: '1',
      type: 'hero',
      name: 'Hero Section',
      order: 1,
      enabled: true,
      content: {
        heading: 'Premium Fashion',
        subheading: 'Discover Your Style',
      },
    },
    {
      id: '2',
      type: 'features',
      name: 'Why Choose Us',
      order: 2,
      enabled: true,
      content: {
        heading: 'Why Choose Valiarian',
        features: [],
      },
    },
    {
      id: '3',
      type: 'gallery',
      name: 'Product Gallery',
      order: 3,
      enabled: false, // Disabled, won't render
      content: {
        images: [],
      },
    },
    {
      id: '4',
      type: 'testimonials',
      name: 'Customer Reviews',
      order: 4,
      enabled: true,
      content: {
        heading: 'What Our Customers Say',
        testimonials: [],
      },
    },
    {
      id: '5',
      type: 'cta',
      name: 'Final CTA',
      order: 5,
      enabled: true,
      content: {
        heading: 'Ready to Shop?',
        description: 'Browse our collection today',
      },
    },
  ];

  const isLoading = false;

  const handleError = (error, errorInfo, section) => {
    console.error('Section error:', {
      sectionId: section.id,
      sectionName: section.name,
      error: error?.error?.message,
    });
  };

  return (
    <SectionList
      sections={sections}
      isLoading={isLoading}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={handleError}
      sx={{
        bgcolor: 'background.default',
      }}
    />
  );
}
