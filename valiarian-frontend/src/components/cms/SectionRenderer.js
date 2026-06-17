import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import FeaturesSection from './FeaturesSection';
import HeroSection from './HeroSection';
import PremiumCountdownSection from 'src/sections/cms/PremiumCountdownSection';

/**
 * Section Renderer Component
 * Dynamically renders the appropriate section component based on type
 */
export default function SectionRenderer({ section }) {
  // Don't render disabled sections
  if (!section.enabled) {
    return null;
  }

  // For custom types, check sectionType in content
  const sectionType = section.type === 'custom' ? section.content?.sectionType : section.type;

  // Render based on section type
  switch (sectionType) {
    case 'hero':
      return <HeroSection section={section} />;

    case 'features':
      return <FeaturesSection section={section} />;

    case 'premium-countdown':
      return <PremiumCountdownSection section={section} />;

    case 'product-grid':
      // TODO: Implement ProductGridSection
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">{section.name}</Typography>
          <Typography color="text.secondary">
            Product Grid Section (Coming Soon)
          </Typography>
        </Box>
      );

    case 'category-grid':
      // TODO: Implement CategoryGridSection
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">{section.name}</Typography>
          <Typography color="text.secondary">
            Category Grid Section (Coming Soon)
          </Typography>
        </Box>
      );

    case 'newsletter':
      // TODO: Implement NewsletterSection
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">{section.name}</Typography>
          <Typography color="text.secondary">
            Newsletter Section (Coming Soon)
          </Typography>
        </Box>
      );

    default:
      // Fallback for unknown section types
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">{section.name}</Typography>
          <Typography color="text.secondary">
            Unknown section type: {sectionType || section.type}
          </Typography>
        </Box>
      );
  }
}

SectionRenderer.propTypes = {
  section: PropTypes.shape({
    type: PropTypes.string.isRequired,
    name: PropTypes.string,
    enabled: PropTypes.bool,
    content: PropTypes.object,
    settings: PropTypes.object,
  }).isRequired,
};
