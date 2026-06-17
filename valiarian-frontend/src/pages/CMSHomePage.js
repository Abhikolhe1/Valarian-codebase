import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { usePageSectionsBySlug } from '../api/cms-query';
import SectionRenderer from '../components/cms/SectionRenderer';

/**
 * CMS-Driven Homepage
 * Fetches sections from CMS and renders them dynamically
 */
export default function CMSHomePage() {
  // Fetch sections for homepage by slug
  const { sections, sectionsLoading, sectionsError } = usePageSectionsBySlug('home');

  // Loading state
  if (sectionsLoading) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading homepage...
        </Typography>
      </Container>
    );
  }

  // Error state
  if (sectionsError) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        <Typography color="text.secondary">
          The homepage could not be loaded.
        </Typography>
      </Container>
    );
  }

  // No sections
  if (!sections || sections.length === 0) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          No Content
        </Typography>
        <Typography color="text.secondary">
          No sections have been added to this page yet.
        </Typography>
      </Container>
    );
  }

  return (
    <Box>
      {/* Render all sections in order */}
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </Box>
  );
}
