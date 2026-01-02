import PropTypes from 'prop-types';
import { useMemo } from 'react';
import orderBy from 'lodash/orderBy';
// @mui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
// api
import { useGetProducts } from 'src/api/product';
// components
import { ProductItemSkeleton } from 'src/sections/product/product-skeleton';
import HomeNewArrivalsCard from './home-new-arrivals-card';

// ----------------------------------------------------------------------

// Dummy products data for Best Sellers section
const DUMMY_BEST_SELLERS = [
  {
    id: 'best-seller-1',
    name: 'Nike Air Force 1 NDESTRUKT',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 5200.84,
    priceSale: 3500.71,
    colors: ['#8E33FF', '#FFD700', '#1890FF'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 2592000000), // 30 days ago
    soldCount: 150,
  },
  {
    id: 'best-seller-2',
    name: 'Foundations Matte Flip Flop',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 2800.22,
    priceSale: 0,
    colors: ['#000000', '#FFFFFF', '#FF4842'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 3456000000), // 40 days ago
    soldCount: 120,
  },
  {
    id: 'best-seller-3',
    name: 'Arizona Soft Footbed Sandal',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 3200.50,
    priceSale: 0,
    colors: ['#00AB55', '#FFC107', '#1890FF'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 4320000000), // 50 days ago
    soldCount: 110,
  },
  {
    id: 'best-seller-4',
    name: 'Gazelle Vintage low-top sneakers',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 4500.00,
    priceSale: 0,
    colors: ['#000000', '#FFFFFF', '#8B4513'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 5184000000), // 60 days ago
    soldCount: 95,
  },
  {
    id: 'best-seller-5',
    name: 'Boston Soft Footbed Sandal',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 3800.75,
    priceSale: 0,
    colors: ['#FF6B6B', '#4ECDC4', '#000000'],
    sizes: ['M', 'L', 'XL', 'XXL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 6048000000), // 70 days ago
    soldCount: 88,
  },
  {
    id: 'best-seller-6',
    name: 'Jordan Delta',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 4300.83,
    priceSale: 2800.22,
    colors: ['#000000', '#FFFFFF', '#FFD700'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 6912000000), // 80 days ago
    soldCount: 85,
  },
  {
    id: 'best-seller-7',
    name: 'Nike Air Zoom Pegasus 37 A.I.R.',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 5500.00,
    priceSale: 0,
    colors: ['#8B0000', '#000000', '#FFFFFF'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 7776000000), // 90 days ago
    soldCount: 75,
  },
  {
    id: 'best-seller-8',
    name: 'Boston Soft Footbed Sandal',
    coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
    price: 3600.50,
    priceSale: 0,
    colors: ['#FFFFFF', '#000000', '#9370DB'],
    sizes: ['S', 'M', 'L', 'XL'],
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 8640000000), // 100 days ago
    soldCount: 70,
  },
];

// ----------------------------------------------------------------------

export default function HomeBestSellers({ products: propProducts, ...other }) {
  // Fetch products if not provided as prop
  const { products: fetchedProducts, productsLoading } = useGetProducts();

  // Get best seller products (sorted by soldCount, limited to 8)
  const products = useMemo(() => {
    // Use prop products if provided, otherwise use fetched products, fallback to dummy data
    let allProducts = [];
    if (propProducts && propProducts.length > 0) {
      allProducts = propProducts;
    } else if (fetchedProducts && fetchedProducts.length > 0) {
      allProducts = fetchedProducts;
    } else {
      allProducts = DUMMY_BEST_SELLERS;
    }

    if (!allProducts.length) return [];

    // Sort by soldCount (or createdAt if soldCount doesn't exist) and limit to 8
    const sorted = orderBy(
      allProducts,
      [(product) => product.soldCount || 0, 'createdAt'],
      ['desc', 'desc']
    );
    return sorted.slice(0, 8);
  }, [propProducts, fetchedProducts]);

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
            Best Sellers
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
            Our most beloved pieces, chosen by customers for their exceptional quality and timeless
            appeal.
          </Typography>
        </Stack>

        {(() => {
          // Show skeleton only if loading AND no dummy data available
          if (productsLoading && !DUMMY_BEST_SELLERS.length) {
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
                  No best sellers at the moment. Check back soon!
                </Typography>
              </Box>
            );
          }

          // Show grid layout with 8 products
          return (
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(4, 1fr)',
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
              {products.map((product) => (
                <HomeNewArrivalsCard key={product.id} product={product} />
              ))}
            </Box>
          );
        })()}
      </Container>
    </Box>
  );
}

HomeBestSellers.propTypes = {
  products: PropTypes.array,
};

