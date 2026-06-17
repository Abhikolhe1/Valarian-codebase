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
import Iconify from 'src/components/iconify';
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
  const subtitle =
    cmsData?.content?.subtitle ||
    'Discover our latest collection of premium cotton polos, crafted with the same attention to detail and commitment to quality.';

  // Carousel logic - Max 3 cards
  const totalProducts = products?.length || 0;
  const showArrows = totalProducts > 3;

  // Calculate slides to show
  const slidesToShow = useMemo(() => {
    if (isMobile) return 1;
    if (isTablet) return Math.min(totalProducts, 2);
    return Math.min(totalProducts, 3);
  }, [isMobile, isTablet, totalProducts]);

  const carousel = useCarousel({
    slidesToShow,
    slidesToScroll: 1,
    infinite: totalProducts > 3,
    centerMode: false,
    autoplay: false,
    speed: 500,
    swipe: true,
    draggable: true,
  });

  const renderSkeleton = (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
      }}
    >
      {[...Array(3)].map((_, index) => (
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
        display: totalProducts === 0 && !isLoading ? 'none' : 'block',
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
          if (isLoading) {
            return renderSkeleton;
          }

          if (error) {
            return (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Iconify
                  icon="solar:danger-triangle-bold"
                  width={48}
                  sx={{ color: 'error.main', mb: 2 }}
                />
                <Typography variant="h6" color="error" gutterBottom>
                  Failed to load products
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please try again later
                </Typography>
              </Box>
            );
          }

          if (totalProducts === 0) {
            return null;
          }

          return (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                display: 'flex',
                justifyContent: totalProducts < 3 && !isMobile ? 'center' : 'flex-start',
              }}
            >
              <Box sx={{ width: '100%', maxWidth: totalProducts < 3 && !isMobile ? `${totalProducts * 330}px` : '100%' }}>
                {showArrows ? (
                  <CarouselArrows
                    filled
                    onNext={carousel.onNext}
                    onPrev={carousel.onPrev}
                    leftButtonProps={{
                      sx: { left: { xs: 0, sm: -20 } },
                    }}
                    rightButtonProps={{
                      sx: { right: { xs: 0, sm: -20 } },
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
                ) : (
                  <Carousel
                    ref={carousel.carouselRef}
                    {...carousel.carouselSettings}
                    sx={{
                      width: '100%',
                      '& .slick-list': {
                        mx: { xs: -1, sm: -1.5 },
                        overflow: 'visible',
                      },
                      '& .slick-track': {
                        display: 'flex !important',
                        alignItems: 'stretch',
                        flexDirection: 'row',
                        justifyContent: totalProducts < 3 && !isMobile ? 'center' : 'flex-start',
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
                )}
              </Box>
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
