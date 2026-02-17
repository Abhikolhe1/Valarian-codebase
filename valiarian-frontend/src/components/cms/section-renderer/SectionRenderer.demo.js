/**
 * SectionRenderer Demo Page
 *
 * This file provides a visual demo of the SectionRenderer component
 * Run this in your app to see the components in action
 */

import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { SectionList, SectionRenderer, SectionSkeleton } from './index';

// ============================================================================
// Demo Page Component
// ============================================================================

export default function SectionRendererDemo() {
  const [demoType, setDemoType] = useState('single');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const handleDemoTypeChange = (event, newType) => {
    if (newType !== null) {
      setDemoType(newType);
    }
  };

  const toggleLoading = () => {
    setIsLoading(!isLoading);
  };

  const toggleErrors = () => {
    setShowErrors(!showErrors);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Section Renderer Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Interactive demonstration of the CMS Section Renderer component
        </Typography>

        {/* Controls */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          <ToggleButtonGroup
            value={demoType}
            exclusive
            onChange={handleDemoTypeChange}
            aria-label="demo type"
          >
            <ToggleButton value="single" aria-label="single section">
              Single Section
            </ToggleButton>
            <ToggleButton value="multiple" aria-label="multiple sections">
              Multiple Sections
            </ToggleButton>
            <ToggleButton value="skeletons" aria-label="loading skeletons">
              Skeletons
            </ToggleButton>
            <ToggleButton value="errors" aria-label="error handling">
              Error Handling
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant={isLoading ? 'contained' : 'outlined'}
            onClick={toggleLoading}
          >
            {isLoading ? 'Hide Loading' : 'Show Loading'}
          </Button>

          <Button
            variant={showErrors ? 'contained' : 'outlined'}
            color="error"
            onClick={toggleErrors}
          >
            {showErrors ? 'Hide Errors' : 'Show Errors'}
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ mb: 6 }} />

      {/* Demo Content */}
      {demoType === 'single' && (
        <SingleSectionDemo isLoading={isLoading} showErrors={showErrors} />
      )}

      {demoType === 'multiple' && (
        <MultipleSectionsDemo isLoading={isLoading} showErrors={showErrors} />
      )}

      {demoType === 'skeletons' && <SkeletonsDemo />}

      {demoType === 'errors' && <ErrorHandlingDemo />}
    </Container>
  );
}

// ============================================================================
// Single Section Demo
// ============================================================================

function SingleSectionDemo({ isLoading, showErrors }) {
  const section = {
    id: 'demo-1',
    type: 'hero',
    name: 'Demo Hero Section',
    order: 1,
    enabled: true,
    content: {
      heading: 'Welcome to Valiarian',
      subheading: 'Premium Fashion for Everyone',
      description: 'Discover our latest collection of premium fabrics',
    },
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Single Section Rendering
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Section Data:
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(section, null, 2)}
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Rendered Output:
        </Typography>
        <SectionRenderer
          section={section}
          isLoading={isLoading}
          showErrorDetails={showErrors}
        />
      </Paper>
    </Box>
  );
}

SingleSectionDemo.propTypes = {
  isLoading: PropTypes.bool,
  showErrors: PropTypes.bool,
};

// ============================================================================
// Multiple Sections Demo
// ============================================================================

function MultipleSectionsDemo({ isLoading, showErrors }) {
  const sections = [
    {
      id: 'demo-1',
      type: 'hero',
      name: 'Hero Section',
      order: 1,
      enabled: true,
      content: {
        heading: 'Welcome',
      },
    },
    {
      id: 'demo-2',
      type: 'features',
      name: 'Features Section',
      order: 2,
      enabled: true,
      content: {
        heading: 'Our Features',
        features: [],
      },
    },
    {
      id: 'demo-3',
      type: 'gallery',
      name: 'Gallery Section',
      order: 3,
      enabled: false, // This won't render
      content: {
        images: [],
      },
    },
    {
      id: 'demo-4',
      type: 'testimonials',
      name: 'Testimonials Section',
      order: 4,
      enabled: true,
      content: {
        heading: 'Customer Reviews',
        testimonials: [],
      },
    },
    {
      id: 'demo-5',
      type: 'cta',
      name: 'CTA Section',
      order: 5,
      enabled: true,
      content: {
        heading: 'Get Started Today',
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Multiple Sections Rendering
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Rendering {sections.filter((s) => s.enabled).length} enabled sections
          (1 disabled section hidden)
        </Typography>
      </Paper>

      <SectionList
        sections={sections}
        isLoading={isLoading}
        showErrorDetails={showErrors}
      />
    </Box>
  );
}

MultipleSectionsDemo.propTypes = {
  isLoading: PropTypes.bool,
  showErrors: PropTypes.bool,
};

// ============================================================================
// Skeletons Demo
// ============================================================================

function SkeletonsDemo() {
  const sectionTypes = [
    'hero',
    'features',
    'testimonials',
    'gallery',
    'cta',
    'text',
    'video',
    'faq',
    'team',
    'pricing',
    'contact',
    'default',
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Loading Skeletons
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Each section type has a custom loading skeleton that matches its layout
      </Typography>

      <Stack spacing={6}>
        {sectionTypes.map((type) => (
          <Paper key={type} elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Section Skeleton
            </Typography>
            <SectionSkeleton type={type} />
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

// ============================================================================
// Error Handling Demo
// ============================================================================

function ErrorHandlingDemo() {
  const scenarios = [
    {
      title: 'Missing Section Data',
      section: null,
      description: 'Shows warning when section data is missing',
    },
    {
      title: 'Unknown Section Type',
      section: {
        id: 'error-1',
        type: 'unknown-type',
        name: 'Unknown Section',
        order: 1,
        enabled: true,
        content: {},
      },
      description: 'Shows warning for unsupported section types',
    },
    {
      title: 'Disabled Section',
      section: {
        id: 'error-2',
        type: 'hero',
        name: 'Disabled Section',
        order: 2,
        enabled: false,
        content: {},
      },
      description: 'Disabled sections are not rendered',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Error Handling
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The section renderer handles various error scenarios gracefully
      </Typography>

      <Stack spacing={4}>
        {scenarios.map((scenario, index) => (
          <Paper key={index} elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {scenario.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {scenario.description}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <SectionRenderer section={scenario.section} showErrorDetails />
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
