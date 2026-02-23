import PropTypes from 'prop-types';
import { useMemo } from 'react';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
// api
import { useNewArrivals } from 'src/api/products';
// components
import Carousel, { CarouselArrows, useCarousel } from 'src/components/carousel';
import { ProductItemSkeleton } from 'src/sections/product/product-skeleton';
import HomeNewArrivalsCard from './home-new-arrivals-card';

// ----------------------------------------------------------------------

export default function HomeNewArrivals({ cmsData, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch real products from API
  const { products, isLoading, error } = useNewArrivals(10);

  // Use CMS data if available
  const title = cmsData?.content?.title || 'New Arrivals';
  const subtitle = cmsData?.content?.subtitle || 'Discover our latest collection of premium cotton polos, crafted with the same attention to detail and commitment to quality.';

  // Always use carousel if we have products
  const needsCarousel = products.length > 0;

  // Calculate slides to show - always 4 on desktop
  const slidesToShow = useMemo(() => {
    if (isMobile) return 1; // 1 card on mobile
    if (isTablet) return 2; // 2 cards on tablet
    return 4; // Always 4 cards on desktop
  }, [isMobile, isTablet]);

  // Calculate slides to scroll - scroll 1 at a time for smooth experience
  const slidesToScroll = useMemo(() => 1, []); // Scroll one card at a time

  const carousel = useCarousel({
    slidesToShow: needsCarousel ? slidesToShow : products.length,
    slidesToScroll,
    infinite: true, // Enable infinite circular loop
    autoplay: false, // Disable auto-scroll
    speed: 500,
    swipe: true, // Enable swipe on mobile
    draggable: true, // Enable dragging
    variableWidth: false, // Fixed width for consistent card sizes
    vertical: false, // Ensure horizontal scrolling
    verticalSwiping: false, // Disable vertical swiping
  });

  const renderSkeleton = (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        },
      }}
    >
      {[...Array(4)].map((_, index) => (
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
        // pt: { xs: 8, md: 10 },
        // pb: { xs: 8, md: 10 },
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
              fontSize: { xs: '2rem', md: undefined },
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              maxWidth: 600,
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
                  No new arrivals at the moment. Check back soon!
                </Typography>
              </Box>
            );
          }

          // Always show horizontal carousel with 4 cards visible
          return (
            <Box sx={{ position: 'relative', width: '100%' }}>
              <CarouselArrows
                filled
                onNext={carousel.onNext}
                onPrev={carousel.onPrev}
                leftButtonProps={{
                  sx: {
                    left: { xs: 0, sm: -20 },
                  },
                }}
                rightButtonProps={{
                  sx: {
                    right: { xs: 0, sm: -20 },
                  },
                }}
              >
                <Carousel
                  ref={carousel.carouselRef}
                  {...carousel.carouselSettings}
                  sx={{
                    '& .slick-list': {
                      mx: { xs: -1, sm: -1.5 },
                      overflow: 'visible',
                    },
                    '& .slick-track': {
                      display: 'flex !important',
                      alignItems: 'stretch',
                      flexDirection: 'row',
                    },
                    '& .slick-slide': {
                      height: 'auto',
                      float: 'none',
                      '& > div': {
                        height: '100%',
                        display: 'flex',
                      },
                    },
                  }}
                >
                  {products.map((product) => (
                    <HomeNewArrivalsCard key={product.id} product={product} />
                  ))}
                </Carousel>
              </CarouselArrows>
            </Box>
          );
        })()}
      </Container>
    </Box>
  );
}

HomeNewArrivals.propTypes = {
  cmsData: PropTypes.object,
};

