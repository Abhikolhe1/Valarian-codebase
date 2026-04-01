import PropTypes from 'prop-types';
import { Component } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
// sections
import {
  CTASection,
  FeaturesSection,
  GallerySection,
  HeroSection,
  PremiumConfidenceSection,
  PremiumCountdownSection,
  PremiumFabricDetailsSection,
  PremiumFeatureGridSection,
  PremiumHeroSection,
  PremiumProductShowcaseSection,
  PremiumReserveCtaSection,
  PremiumStatementSection,
  TestimonialsSection,
  TextSection,
} from 'src/sections/cms';
// components
import SectionSkeleton from './SectionSkeleton';

// ----------------------------------------------------------------------

/**
 * Error Boundary for Section Rendering
 * Catches errors in section components and displays fallback UI
 */
class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Section rendering error:', error, errorInfo);

    const { onError, section } = this.props;

    // Optional: Send error to logging service
    if (onError) {
      onError(error, errorInfo, section);
    }
  }

  render() {
    const { hasError, error } = this.state;
    const { showErrorDetails, section, children } = this.props;

    if (hasError) {
      return (
        <Box sx={{ py: 3 }}>
          <Alert severity="error">
            <AlertTitle>Section Rendering Error</AlertTitle>
            {showErrorDetails && error?.message ? (
              <>
                Failed to render section: <strong>{section?.name || 'Unknown'}</strong>
                <br />
                Error: {error?.error?.message}
              </>
            ) : (
              <>
                Failed to render section: <strong>{section?.name || 'Unknown'}</strong>
              </>
            )}
          </Alert>
        </Box>
      );
    }

    return children;
  }
}

SectionErrorBoundary.propTypes = {
  children: PropTypes.node,
  section: PropTypes.object,
  onError: PropTypes.func,
  showErrorDetails: PropTypes.bool,
};

// ----------------------------------------------------------------------

/**
 * Section Renderer Component
 * Maps section types to their corresponding components
 * Includes error boundaries and loading states
 */
export default function SectionRenderer({
  section,
  isLoading = false,
  showErrorDetails = false,
  onError,
  sx,
  ...other
}) {
  // Show loading skeleton while section is loading
  if (isLoading) {
    return <SectionSkeleton type={section?.type} sx={sx} />;
  }

  // Validate section data
  if (!section) {
    return (
      <Box sx={{ py: 3, ...sx }}>
        <Alert severity="warning">
          <AlertTitle>Missing Section Data</AlertTitle>
          No section data provided
        </Alert>
      </Box>
    );
  }

  // Check if section is enabled
  if (section.enabled === false) {
    return null;
  }

  // Get the component for this section type
  const SectionComponent = getSectionComponent(section.type);

  // Handle unknown section types
  if (!SectionComponent) {
    return (
      <Box sx={{ py: 3, ...sx }}>
        <Alert severity="warning">
          <AlertTitle>Unknown Section Type</AlertTitle>
          Section type <strong>{section.type}</strong> is not supported
        </Alert>
      </Box>
    );
  }

  // Render section with error boundary
  return (
    <SectionErrorBoundary
      section={section}
      onError={onError}
      showErrorDetails={showErrorDetails}
    >
      <Box
        sx={{
          width: '100%',
          ...sx,
        }}
        {...other}
      >
        <SectionComponent section={section} />
      </Box>
    </SectionErrorBoundary>
  );
}

SectionRenderer.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    enabled: PropTypes.bool,
    content: PropTypes.object.isRequired,
    settings: PropTypes.object,
  }),
  isLoading: PropTypes.bool,
  showErrorDetails: PropTypes.bool,
  onError: PropTypes.func,
  sx: PropTypes.object,
};

// ----------------------------------------------------------------------

/**
 * Get the component for a given section type
 * Returns null if the section type is not found
 */
function getSectionComponent(type) {
  const sectionComponents = {
    'premium-hero': PremiumHeroSection,
    'premium-product-showcase': PremiumProductShowcaseSection,
    'premium-fabric-details': PremiumFabricDetailsSection,
    'premium-statement': PremiumStatementSection,
    'premium-feature-grid': PremiumFeatureGridSection,
    'premium-confidence': PremiumConfidenceSection,
    'premium-reserve-cta': PremiumReserveCtaSection,
    'premium-countdown': PremiumCountdownSection,
    hero: HeroSection,
    features: FeaturesSection,
    testimonials: TestimonialsSection,
    gallery: GallerySection,
    cta: CTASection,
    text: TextSection,
    video: null, // Future implementation
    faq: null, // Future implementation
    team: null, // Future implementation
    pricing: null, // Future implementation
    contact: null, // Future implementation
    custom: null, // Future implementation
  };

  return sectionComponents[type] || null;
}

// ----------------------------------------------------------------------

/**
 * Render multiple sections in order
 * Useful for rendering all sections of a page
 */
export function SectionList({
  sections = [],
  isLoading = false,
  showErrorDetails = false,
  onError,
  sx,
  ...other
}) {
  if (isLoading) {
    return (
      <Box sx={sx} {...other}>
        {[1, 2, 3].map((index) => (
          <SectionSkeleton key={index} sx={{ mb: 4 }} />
        ))}
      </Box>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', ...sx }} {...other}>
        <Alert severity="info">
          <AlertTitle>No Content</AlertTitle>
          No sections available for this page
        </Alert>
      </Box>
    );
  }

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <Box sx={sx} {...other}>
      {sortedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          showErrorDetails={showErrorDetails}
          onError={onError}
          sx={{ mb: 0 }}
        />
      ))}
    </Box>
  );
}

SectionList.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      order: PropTypes.number.isRequired,
      enabled: PropTypes.bool,
      content: PropTypes.object.isRequired,
      settings: PropTypes.object,
    })
  ),
  isLoading: PropTypes.bool,
  showErrorDetails: PropTypes.bool,
  onError: PropTypes.func,
  sx: PropTypes.object,
};
