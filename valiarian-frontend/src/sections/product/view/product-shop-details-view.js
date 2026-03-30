import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import { alpha } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { useGetProduct } from 'src/api/product';
import { useParams } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
//
import CartIcon from '../common/cart-icon';
import { useCheckout } from '../hooks';
import ProductDetailsCarousel from '../product-details-carousel';
import ProductDetailsDescription from '../product-details-description';
import ProductDetailsReview from '../product-details-review';
import ProductDetailsSummary from '../product-details-summary';
import { ProductDetailsSkeleton } from '../product-skeleton';

// ----------------------------------------------------------------------

const SUMMARY = [
  {
    title: '100% Original',
    description: 'Chocolate bar candy canes ice cream toffee cookie halvah.',
    icon: 'solar:verified-check-bold',
  },
  {
    title: '10 Day Replacement',
    description: 'Marshmallow biscuit donut dragée fruitcake wafer.',
    icon: 'solar:clock-circle-bold',
  },
  {
    title: 'Year Warranty',
    description: 'Cotton candy gingerbread cake I love sugar sweet.',
    icon: 'solar:shield-check-bold',
  },
];

// ----------------------------------------------------------------------

// Helper function to get dummy product by ID with all required fields
const getDummyProductById = (productId) => {
  // Base product structure with all required fields
  const createProduct = (base) => ({
    ...base,
    available: base.available || 100,
    inventoryType: 'in_stock',
    description:
      base.description ||
      `${base.name}. Premium quality product with exceptional comfort and style. Perfect for everyday wear.`,
    subDescription: base.subDescription || 'Experience premium quality and comfort.',
    images: base.images || [
      base.coverUrl,
      '/assets/images/home/social-media/social-2.jpeg',
      '/assets/images/home/social-media/social-3.jpeg',
    ],
    reviews: base.reviews || [],
    ratings: base.ratings || {
      5: Math.floor(base.totalRatings * 0.7),
      4: Math.floor(base.totalRatings * 0.2),
      3: Math.floor(base.totalRatings * 0.08),
      2: Math.floor(base.totalRatings * 0.02),
      1: 0,
    },
    totalReviews: base.totalReviews || Math.floor(base.totalRatings * 0.4),
  });

  const DUMMY_PRODUCTS_MAP = {
    'short-1': createProduct({
      id: 'short-1',
      name: 'Classic Short Sleeve Polo',
      coverUrl: '/assets/images/home/social-media/social-1.jpeg',
      price: 1299,
      priceSale: 999,
      colors: ['#000000', '#FFFFFF', '#1890FF'],
      sizes: ['S', 'M', 'L', 'XL'],
      category: 'Short Sleeves',
      categorySlug: 'short-sleeves',
      gender: ['Men'],
      rating: 4.5,
      totalRatings: 120,
      totalSold: 50,
      newLabel: { enabled: true, content: 'New' },
      saleLabel: { enabled: true, content: 'Sale' },
      createdAt: new Date(),
    }),
    'short-2': createProduct({
      id: 'short-2',
      name: 'Premium Cotton Short Sleeve',
      coverUrl: '/assets/images/home/social-media/social-2.jpeg',
      price: 1499,
      priceSale: 0,
      colors: ['#FF4842', '#00AB55'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      category: 'Short Sleeves',
      categorySlug: 'short-sleeves',
      gender: ['Men'],
      rating: 4.8,
      totalRatings: 89,
      totalSold: 75,
      newLabel: { enabled: true, content: 'New' },
      saleLabel: { enabled: false, content: '' },
      createdAt: new Date(Date.now() - 86400000),
    }),
    'short-3': createProduct({
      id: 'short-3',
      name: 'Essential Short Sleeve T-Shirt',
      coverUrl: '/assets/images/home/social-media/social-3.jpeg',
      price: 1199,
      priceSale: 899,
      colors: ['#00AB55', '#1890FF', '#FFC107'],
      sizes: ['S', 'M', 'L'],
      category: 'Short Sleeves',
      categorySlug: 'short-sleeves',
      gender: ['Men', 'Women'],
      rating: 4.2,
      totalRatings: 65,
      totalSold: 40,
      newLabel: { enabled: false, content: '' },
      saleLabel: { enabled: true, content: 'Sale' },
      createdAt: new Date(Date.now() - 172800000),
    }),
    'short-4': createProduct({
      id: 'short-4',
      name: 'Modern Fit Short Sleeve',
      coverUrl: '/assets/images/home/social-media/social-4.jpeg',
      price: 1399,
      priceSale: 1099,
      colors: ['#FFFFFF', '#000000', '#8E33FF'],
      sizes: ['M', 'L', 'XL'],
      category: 'Short Sleeves',
      categorySlug: 'short-sleeves',
      gender: ['Men'],
      rating: 4.6,
      totalRatings: 200,
      totalSold: 150,
      newLabel: { enabled: false, content: '' },
      saleLabel: { enabled: true, content: 'Sale' },
      createdAt: new Date(Date.now() - 259200000),
    }),
    'short-5': createProduct({
      id: 'short-5',
      name: 'Comfort Fit Short Sleeve',
      coverUrl: '/assets/images/home/social-media/social-5.jpeg',
      price: 1599,
      priceSale: 0,
      colors: ['#000000', '#FF4842', '#94D82D'],
      sizes: ['S', 'M', 'L', 'XL'],
      category: 'Short Sleeves',
      categorySlug: 'short-sleeves',
      gender: ['Men'],
      rating: 4.7,
      totalRatings: 45,
      totalSold: 30,
      newLabel: { enabled: true, content: 'New' },
      saleLabel: { enabled: false, content: '' },
      createdAt: new Date(Date.now() - 345600000),
    }),
    'short-6': createProduct({
      id: 'short-6',
      name: 'Classic Crew Short Sleeve',
      coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
      price: 999,
      priceSale: 799,
      colors: ['#1890FF', '#FFC0CB', '#000000'],
      sizes: ['S', 'M', 'L', 'XL'],
      category: 'Short Sleeves',
      categorySlug: 'short-sleeves',
      gender: ['Men', 'Women'],
      rating: 4.3,
      totalRatings: 70,
      totalSold: 45,
      newLabel: { enabled: false, content: '' },
      saleLabel: { enabled: true, content: 'Sale' },
      createdAt: new Date(Date.now() - 432000000),
    }),
    'full-1': createProduct({
      id: 'full-1',
      name: 'Premium Full Sleeve Polo',
      coverUrl: '/assets/images/home/social-media/social-1.jpeg',
      price: 1799,
      priceSale: 1399,
      colors: ['#000000', '#FFFFFF'],
      sizes: ['M', 'L', 'XL'],
      category: 'Full Sleeves',
      categorySlug: 'full-sleeves',
      gender: ['Men'],
      rating: 4.8,
      totalRatings: 89,
      totalSold: 75,
      newLabel: { enabled: true, content: 'New' },
      saleLabel: { enabled: true, content: 'Sale' },
      createdAt: new Date(),
    }),
    'full-2': createProduct({
      id: 'full-2',
      name: 'Classic Full Sleeve T-Shirt',
      coverUrl: '/assets/images/home/social-media/social-2.jpeg',
      price: 1599,
      priceSale: 0,
      colors: ['#FF4842', '#00AB55', '#1890FF'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      category: 'Full Sleeves',
      categorySlug: 'full-sleeves',
      gender: ['Men'],
      rating: 4.5,
      totalRatings: 120,
      totalSold: 50,
      newLabel: { enabled: true, content: 'New' },
      saleLabel: { enabled: false, content: '' },
      createdAt: new Date(Date.now() - 86400000),
    }),
    'full-3': createProduct({
      id: 'full-3',
      name: 'Warm Full Sleeve Pullover',
      coverUrl: '/assets/images/home/social-media/social-3.jpeg',
      price: 1999,
      priceSale: 1499,
      colors: ['#000000', '#8E33FF', '#FFC107'],
      sizes: ['M', 'L', 'XL'],
      category: 'Full Sleeves',
      categorySlug: 'full-sleeves',
      gender: ['Men'],
      rating: 4.6,
      totalRatings: 95,
      totalSold: 60,
      newLabel: { enabled: false, content: '' },
      saleLabel: { enabled: true, content: 'Sale' },
      createdAt: new Date(Date.now() - 172800000),
    }),
    'full-4': createProduct({
      id: 'full-4',
      name: 'Comfort Full Sleeve',
      coverUrl: '/assets/images/home/social-media/social-4.jpeg',
      price: 1699,
      priceSale: 0,
      colors: ['#FFFFFF', '#000000', '#1890FF'],
      sizes: ['S', 'M', 'L', 'XL'],
      category: 'Full Sleeves',
      categorySlug: 'full-sleeves',
      gender: ['Men', 'Women'],
      rating: 4.4,
      totalRatings: 65,
      totalSold: 40,
      newLabel: { enabled: false, content: '' },
      saleLabel: { enabled: false, content: '' },
      createdAt: new Date(Date.now() - 259200000),
    }),
    'full-5': createProduct({
      id: 'full-5',
      name: 'Premium Full Sleeve Classic',
      coverUrl: '/assets/images/home/social-media/social-5.jpeg',
      price: 1899,
      priceSale: 1599,
      colors: ['#000000', '#FF4842'],
      sizes: ['M', 'L', 'XL'],
      category: 'Full Sleeves',
      categorySlug: 'full-sleeves',
      gender: ['Men'],
      rating: 4.7,
      totalRatings: 200,
      totalSold: 150,
      newLabel: { enabled: false, content: '' },
      saleLabel: { enabled: true, content: 'Sale' },
      createdAt: new Date(Date.now() - 345600000),
    }),
    'full-6': createProduct({
      id: 'full-6',
      name: 'Modern Full Sleeve Design',
      coverUrl: '/assets/images/home/new-arrival/t-shirt1.jpeg',
      price: 2199,
      priceSale: 0,
      colors: ['#00AB55', '#1890FF', '#FFC107'],
      sizes: ['S', 'M', 'L', 'XL'],
      category: 'Full Sleeves',
      categorySlug: 'full-sleeves',
      gender: ['Men'],
      rating: 4.9,
      totalRatings: 45,
      totalSold: 30,
      newLabel: { enabled: true, content: 'New' },
      saleLabel: { enabled: false, content: '' },
      createdAt: new Date(Date.now() - 432000000),
    }),
  };

  return DUMMY_PRODUCTS_MAP[productId];
};

export default function ProductShopDetailsView() {
  const params = useParams();

  const { id } = params;

  const settings = useSettingsContext();

  const { checkout, onAddCart, onBuyNow, onGotoStep } = useCheckout();

  const [currentTab, setCurrentTab] = useState('description');
  const [selectedVariant, setSelectedVariant] = useState(null);

  const { product: apiProduct, productLoading } = useGetProduct(`${id}`);

  // Use dummy product if API doesn't return data
  const dummyProduct = useMemo(() => getDummyProductById(id), [id]);
  const product = apiProduct || dummyProduct;

  // Scroll to top when component mounts or product ID changes
  // Using useLayoutEffect to ensure scroll happens before paint
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handleVariantChange = useCallback((variant) => {
    setSelectedVariant(variant);
  }, []);


  const renderSkeleton = <ProductDetailsSkeleton />;

  const renderProduct = product && (
    <>
      <CustomBreadcrumbs
        links={[
          { name: 'Home', href: '/' },
          {
            name: 'Products',
            href: paths.product.root,
          },
          { name: product?.name },
        ]}
        sx={{ mb: 5, mt: 0, pt: 0 }}
      />

      <Grid container spacing={{ xs: 3, md: 5, lg: 8 }}>
        <Grid xs={12} md={6} lg={7}>
          <ProductDetailsCarousel product={product} selectedVariant={selectedVariant} />
        </Grid>

        <Grid xs={12} md={6} lg={5}>
          <ProductDetailsSummary
            product={product}
            cart={checkout.cart}
            onAddCart={onAddCart}
            onBuyNow={onBuyNow}
            onGotoStep={onGotoStep}
            onVariantChange={handleVariantChange}
          />
        </Grid>
      </Grid>

      <Box
        gap={5}
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          md: 'repeat(3, 1fr)',
        }}
        sx={{ my: 10 }}
      >
        {SUMMARY.map((item) => (
          <Box key={item.title} sx={{ textAlign: 'center', px: 5 }}>
            <Iconify icon={item.icon} width={32} sx={{ color: 'primary.main' }} />

            <Typography variant="subtitle1" sx={{ mb: 1, mt: 2 }}>
              {item.title}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {item.description}
            </Typography>
          </Box>
        ))}
      </Box>

      <Card>
        .
        <Tabs
          value={currentTab}
          onChange={handleChangeTab}
          sx={{
            px: 3,
            boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
          }}
        >
          {[
            {
              value: 'description',
              label: 'Description',
            },
            {
              value: 'reviews',
              label: 'Reviews',
            },
          ].map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        {currentTab === 'description' && (
          <ProductDetailsDescription description={product?.description} />
        )}

        {currentTab === 'reviews' && <ProductDetailsReview productId={apiProduct?.id} />}
      </Card>
    </>
  );

  return (
    <Container
      maxWidth={settings.themeStretch ? false : 'lg'}
      sx={{
        mb: 15,
        pt: 0,
      }}
    >
      <CartIcon totalItems={checkout.totalItems} />

      {productLoading && renderSkeleton}

      {/* {productError && renderError} */}

      {product && renderProduct}
    </Container>
  );
}
