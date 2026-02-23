import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
// api
import { useBestSellers } from 'src/api/products';
// components
import { ProductItemSkeleton } from 'src/sections/product/product-skeleton';
import HomeNewArrivalsCard from './home-new-arrivals-card';

// ----------------------------------------------------------------------

export default function HomeBestSellers({ cmsData, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // Mobile: below md breakpoint

  // State for mobile view: number of visible cards (4, 6, or 8)
  const [visibleCardsMobile, setVisibleCardsMobile] = useState(4);

  // Fetch real products from API
  const { products, isLoading, error } = useBestSellers(10);

  // Use CMS data for title and subtitle
  const title = cmsData?.content?.title || 'Best Sellers';
  const subtitle = cmsData?.content?.subtitle || 'Our most beloved pieces, chosen by customers for their exceptional quality and timeless appeal.';

  // Get products to display: on mobile, limit to visibleCardsMobile; on desktop, show all (max 8)
  const displayedProducts = useMemo(() => {
    if (isMobile) {
      return products.slice(0, visibleCardsMobile);
    }
    return products.slice(0, 8); // Limit to 8 on desktop
  }, [products, visibleCardsMobile, isMobile]);

  // Handle "View More" button click: add 2 more cards (max 8)
  const handleViewMore = () => {
    setVisibleCardsMobile((prev) => Math.min(prev + 2, 8));
  };

  // Check if "View More" button should be shown (only on mobile, and only if there are more cards)
  const showViewMoreButton = isMobile && visibleCardsMobile < products.length;

  const renderSkeleton = (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)', // Mobile: 2 columns
          md: 'repeat(4, 1fr)', // Desktop: 4 columns
        },
      }}
    >
      {[...Array(8)].map((_, index) => (
        <ProductItemSkeleton key={index} />
      ))}
    </Box>
  );

  return (
    <Box
      {...other}
      sx={{
        position: 'relative',
        width: '100%',
        bgcolor: 'background.default',
        zIndex: 1,
      }}
    >
      <Container>
        <Stack spacing={2} sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: 'text.primary',
              mb: 2,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              maxWidth: 800,
              mx: 'auto',
              mb: { xs: 2, md: 3 },
            }}
          >
            {subtitle}
          </Typography>
        </Stack>

        {(() => {
          // Show skeleton while loading
          if (isLoading) {
            return renderSkeleton;
          }

          // Show error state
          if (error) {
            return (
              <Box
                sx={{
                  py: 10,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" color="error" gutterBottom>
                  Failed to load products
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please try again later
                </Typography>
              </Box>
            );
          }

          // Show empty state
          if (!products.length) {
            return (
              <Box
                sx={{
                  py: 10,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No best sellers at the moment. Check back soon!
                </Typography>
              </Box>
            );
          }

          // Show grid layout with products
          return (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)', // Mobile: 2 columns
                    md: 'repeat(4, 1fr)', // Desktop: 4 columns
                  },
                  '& > *': {
                    width: '100%',
                    minWidth: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  },
                }}
              >
                {displayedProducts.map((product) => (
                  <HomeNewArrivalsCard key={product.id} product={product} />
                ))}
              </Box>

              {/* View More Button - Only visible on mobile */}
              {showViewMoreButton && (
                <Box
                  sx={{
                    display: { xs: 'flex', md: 'none' },
                    justifyContent: 'center',
                    mt: 4,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleViewMore}
                    sx={{
                      minWidth: 200,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    View More
                  </Button>
                </Box>
              )}
            </>
          );
        })()}
      </Container>
    </Box>
  );
}

HomeBestSellers.propTypes = {
  cmsData: PropTypes.shape({
    content: PropTypes.shape({
      title: PropTypes.string,
      subtitle: PropTypes.string,
    }),
  }),
};
