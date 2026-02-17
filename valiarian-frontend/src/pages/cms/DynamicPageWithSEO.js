import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
// @mui
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
// hooks
import { usePageBySlug, useSettings } from 'src/api/cms-query';
// components
import { SectionList } from 'src/components/cms/section-renderer/SectionRenderer';
import { PageSEO } from 'src/components/seo';
// utils
import {
  formatPageTitle,
  generateOrganizationSchema,
  generateWebPageSchema,
  mergeSchemas,
} from 'src/utils/seo';

// ----------------------------------------------------------------------

/**
 * Dynamic Page Component with Enhanced SEO
 * Fetches and renders a CMS page with comprehensive SEO optimization
 *
 * @component
 * @example
 * ```jsx
 * // In router configuration
 * <Route path="/page/:slug" element={<DynamicPageWithSEO />} />
 *
 * // Or with explicit slug prop
 * <DynamicPageWithSEO slug="about-us" />
 * ```
 */
export default function DynamicPageWithSEO({ slug: slugProp }) {
  const { slug: slugParam } = useParams();
  const slug = slugProp || slugParam;

  // Fetch page data by slug
  const { data: pageData, isLoading: pageLoading, error: pageError } = usePageBySlug(slug, {
    enabled: !!slug,
  });

  // Fetch site settings for SEO
  const { data: settingsData, isLoading: settingsLoading } = useSettings();

  const page = pageData?.page;
  const settings = settingsData?.settings;

  const isLoading = pageLoading || settingsLoading;

  // Loading state
  if (isLoading) {
    return <DynamicPageSkeleton />;
  }

  // Error state
  if (pageError) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          <AlertTitle>Error Loading Page</AlertTitle>
          {pageError.message || 'Failed to load page content. Please try again later.'}
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

  // Generate structured data
  const structuredData = page.structuredData || mergeSchemas(
    generateWebPageSchema(page, settings),
    generateOrganizationSchema(settings)
  );

  // Format page title
  const pageTitle = formatPageTitle(
    page.seoTitle || page.title,
    settings?.siteName
  );

  // Render page sections
  return (
    <>
      {/* SEO Meta Tags */}
      <PageSEO
        title={pageTitle}
        description={page.seoDescription || page.description}
        keywords={page.seoKeywords}
        ogImage={page.ogImage}
        ogImageAlt={page.ogImageAlt}
        structuredData={structuredData}
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
              error: error.message,
              errorInfo,
            });
          }}
        />
      </Box>
    </>
  );
}

DynamicPageWithSEO.propTypes = {
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
