import PropTypes from 'prop-types';
import { useMemo } from 'react';
import orderBy from 'lodash/orderBy';
// @mui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import useMediaQuery from '@mui/material/useMediaQuery';
// api
import { useGetProducts } from 'src/api/product';
// components
import Carousel, { CarouselArrows, useCarousel } from 'src/components/carousel';
import { ProductItemSkeleton } from 'src/sections/product/product-skeleton';
import HomeNewArrivalsCard from './home-new-arrivals-card';

// ----------------------------------------------------------------------

// Dummy products data for New Arrivals section
const DUMMY_NEW_ARRIVALS = [
  {
    id: 'new-arrival-1',
    name: 'Premium Cotton Classic T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1299,
    priceSale: 0,
    colors: ['#000000', '#FFFFFF', '#1890FF'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(),
  },
  {
    id: 'new-arrival-2',
    name: 'Essential Comfort Fit T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1499,
    priceSale: 1199,
    colors: ['#FF4842', '#00AB55', '#FFC107'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
  },
  {
    id: 'new-arrival-3',
    name: 'Modern Fit Premium T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1599,
    priceSale: 0,
    colors: ['#000000', '#FFFFFF', '#94D82D'],
    sizes: ['M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
  },
  {
    id: 'new-arrival-4',
    name: 'Classic Crew Neck T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1399,
    priceSale: 1099,
    colors: ['#1890FF', '#FFC0CB', '#000000'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 259200000), // 3 days ago
  },
  {
    id: 'new-arrival-5',
    name: 'Premium Quality Basic T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1199,
    priceSale: 0,
    colors: ['#FFFFFF', '#000000', '#FF4842'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 345600000), // 4 days ago
  },
  {
    id: 'new-arrival-6',
    name: 'Slim Fit Premium T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1699,
    priceSale: 1399,
    colors: ['#000000', '#FFFFFF', '#8B4513'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 432000000), // 5 days ago
  },
  {
    id: 'new-arrival-7',
    name: 'Relaxed Fit Comfort T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1299,
    priceSale: 0,
    colors: ['#FF6B6B', '#4ECDC4', '#000000'],
    sizes: ['M', 'L', 'XL', 'XXL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 518400000), // 6 days ago
  },
  {
    id: 'new-arrival-8',
    name: 'Athletic Performance T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1799,
    priceSale: 1499,
    colors: ['#000000', '#FFFFFF', '#FFD700'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 604800000), // 7 days ago
  },
  {
    id: 'new-arrival-9',
    name: 'Vintage Style Classic T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1399,
    priceSale: 0,
    colors: ['#8B0000', '#000000', '#FFFFFF'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 691200000), // 8 days ago
  },
  {
    id: 'new-arrival-10',
    name: 'Ultra Soft Premium T-Shirt',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 1599,
    priceSale: 1299,
    colors: ['#FFFFFF', '#000000', '#9370DB'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 777600000), // 9 days ago
  },
];

// ----------------------------------------------------------------------

export default function HomeNewArrivals({ products: propProducts, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch products if not provided as prop
  const { products: fetchedProducts, productsLoading, productsError } = useGetProducts();

  // Get newest products (sorted by createdAt, no limit - show all products)
  const products = useMemo(() => {
    // Use prop products if provided, otherwise use fetched products, fallback to dummy data
    let allProducts = [];
    if (propProducts && propProducts.length > 0) {
      allProducts = propProducts;
    } else if (fetchedProducts && fetchedProducts.length > 0) {
      allProducts = fetchedProducts;
    } else {
      allProducts = DUMMY_NEW_ARRIVALS;
    }
    
    if (!allProducts.length) return [];
    const sorted = orderBy(allProducts, ['createdAt'], ['desc']);
    return sorted; // Show all products, no limit
  }, [propProducts, fetchedProducts]);


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
        pt: { xs: 8, md: 10 },
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
            New Arrivals
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
            Discover our latest collection of premium cotton polos, crafted with the same attention
            to detail and commitment to quality.
          </Typography>
        </Stack>

        {(() => {
          // Show skeleton only if loading AND no dummy data available
          if (productsLoading && !DUMMY_NEW_ARRIVALS.length) {
            return renderSkeleton;
          }

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
  products: PropTypes.array,
};

