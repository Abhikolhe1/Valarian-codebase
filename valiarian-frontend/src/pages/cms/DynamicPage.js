import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
// @mui
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
// hooks
import { usePageBySlug } from 'src/api/cms-query';
// components
import { SectionList } from 'src/components/cms/section-renderer/SectionRenderer';
import PageSEO from 'src/components/seo/PageSEO';

// ----------------------------------------------------------------------

/**
 * Dynamic Page Component
 * Fetches and renders a CMS page by slug with all its sections
 *
 * @component
 * @example
 * ```jsx
 * // In router configuration
 * <Route path="/page/:slug" element={<DynamicPage />} />
 *
 * // Or with explicit slug prop
 * <DynamicPage slug="about-us" />
 * ```
 */
export default function DynamicPage({ slug: slugProp }) {
  const { slug: slugParam } = useParams();
  const slug = slugProp || slugParam;

  // Fetch page data by slug
  const { data, isLoading, error } = usePageBySlug(slug, {
    enabled: !!slug,
  });

  const page = data?.page;

  // Loading state
  if (isLoading) {
    return <DynamicPageSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          <AlertTitle>Error Loading Page</AlertTitle>
          {error?.error?.message || 'Failed to load page content. Please try again later.'}
        </Alert>
      </Container>
    );
  }

  // Page not found
  if (!page) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="warning">
          <AlertTitle>Page Not Found</AlertTitle>
          The page you are looking for does not exist or has been removed.
        </Alert>
      </Container>
    );
  }

  // Check if page is published
  if (page.status !== 'published') {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="info">
          <AlertTitle>Page Not Available</AlertTitle>
          This page is currently not published.
        </Alert>
      </Container>
    );
  }

  // Render page sections
  return (
    <>
      {/* SEO Meta Tags */}
      <PageSEO
        title={page.seoTitle || page.title}
        description={page.seoDescription || page.description}
        keywords={page.seoKeywords}
        ogImage={page.ogImage}
        ogImageAlt={page.ogImageAlt}
        structuredData={page.structuredData}
        canonicalUrl={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      {/* Page Content */}
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <SectionList
          sections={page.sections || []}
          showErrorDetails={process.env.NODE_ENV === 'development'}
          onError={(error, errorInfo, section) => {
            // Log errors in production
            console.error('Section rendering error:', {
              page: page.slug,
              section: section?.name,
              error: error?.error?.message,
              errorInfo,
            });
          }}
        />
      </Box>
    </>
  );
}

DynamicPage.propTypes = {
  slug: PropTypes.string,
};

// ----------------------------------------------------------------------

/**
 * Loading skeleton for dynamic page
 */
function DynamicPageSkeleton() {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Hero skeleton */}
      <Skeleton
        variant="rectangular"
        sx={{
          width: '100%',
          height: { xs: 400, md: 600 },
          mb: 0,
        }}
      />

      {/* Content sections skeleton */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 2, maxWidth: 600 }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 4, maxWidth: 800 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, mb: 6 }}>
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} variant="rectangular" sx={{ height: 200, borderRadius: 2 }} />
          ))}
        </Box>

        <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 2, maxWidth: 600 }} />
        <Skeleton variant="rectangular" sx={{ height: 400, borderRadius: 2, mb: 4 }} />
      </Container>
    </Box>
  );
}
