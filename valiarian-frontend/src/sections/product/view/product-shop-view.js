import orderBy from 'lodash/orderBy';
import isEqual from 'lodash/isEqual';
import { useCallback, useState, useEffect, useMemo } from 'react';
// @mui
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';
import { useSearchParams } from 'src/routes/hook';
// routes
import { paths } from 'src/routes/paths';
// utils
import { paramCase } from 'src/utils/change-case';
// _mock
import {
  PRODUCT_SORT_OPTIONS,
  PRODUCT_COLOR_OPTIONS,
  PRODUCT_GENDER_OPTIONS,
  PRODUCT_RATING_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
} from 'src/_mock';
// api
import { useGetProducts, useSearchProducts } from 'src/api/product';
// components
import EmptyContent from 'src/components/empty-content';
import { useSettingsContext } from 'src/components/settings';
//
import { useCheckout } from '../hooks';
import CartIcon from '../common/cart-icon';
import ProductList from '../product-list';
import ProductSort from '../product-sort';
import ProductSearch from '../product-search';
import ProductFilters from '../product-filters';
import ProductFiltersResult from '../product-filters-result';

// ----------------------------------------------------------------------

const defaultFilters = {
  gender: [],
  colors: [],
  rating: '',
  category: 'all',
  priceRange: [0, 200],
};

// ----------------------------------------------------------------------

// Dummy products for testing
// Short Sleeves Products
const SHORT_SLEEVES_PRODUCTS = [
  {
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
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(),
  },
  {
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
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 86400000),
  },
  {
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
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 172800000),
  },
  {
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
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 259200000),
  },
  {
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
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 345600000),
  },
  {
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
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 432000000),
  },
];

// Full Sleeves Products
const FULL_SLEEVES_PRODUCTS = [
  {
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
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(),
  },
  {
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
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 86400000),
  },
  {
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
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 172800000),
  },
  {
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
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 259200000),
  },
  {
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
    available: true,
    newLabel: { enabled: false, content: '' },
    saleLabel: { enabled: true, content: 'Sale' },
    createdAt: new Date(Date.now() - 345600000),
  },
  {
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
    available: true,
    newLabel: { enabled: true, content: 'New' },
    saleLabel: { enabled: false, content: '' },
    createdAt: new Date(Date.now() - 432000000),
  },
];

// Combine all dummy products
const DUMMY_PRODUCTS = [...SHORT_SLEEVES_PRODUCTS, ...FULL_SLEEVES_PRODUCTS];

export default function ProductShopView() {
  const settings = useSettingsContext();
  const searchParams = useSearchParams();
  const categoryFromQuery = searchParams.get('category');

  const { checkout } = useCheckout();

  const openFilters = useBoolean();

  const [sortBy, setSortBy] = useState('featured');

  const [searchQuery, setSearchQuery] = useState('');

  const debouncedQuery = useDebounce(searchQuery);

  const [filters, setFilters] = useState(defaultFilters);

  const { products: fetchedProducts, productsLoading } = useGetProducts();

  // Use dummy products if no products from API
  const products = useMemo(() => {
    if (fetchedProducts && fetchedProducts.length > 0) {
      return fetchedProducts;
    }
    return DUMMY_PRODUCTS;
  }, [fetchedProducts]);

  // Calculate productsEmpty based on actual products
  const productsEmpty = useMemo(
    () => !productsLoading && products.length === 0,
    [productsLoading, products.length]
  );

  const { searchResults, searchLoading } = useSearchProducts(debouncedQuery);

  // Update filters when category query parameter changes from URL
  useEffect(() => {
    if (categoryFromQuery) {
      // Use the category name directly from query parameter
      const categoryName = decodeURIComponent(categoryFromQuery);
      setFilters((prev) => ({
        ...prev,
        category: categoryName,
      }));
    } else {
      // Reset to all if no category in query
      setFilters((prev) => ({
        ...prev,
        category: 'all',
      }));
    }
  }, [categoryFromQuery]);

  const handleFilters = useCallback((name, value) => {
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);

  const dataFiltered = applyFilter({
    inputData: products,
    filters,
    sortBy,
  });

  const canReset = !isEqual(defaultFilters, filters);

  const notFound = !dataFiltered.length && canReset;

  const handleSortBy = useCallback((newValue) => {
    setSortBy(newValue);
  }, []);

  const handleSearch = useCallback((inputValue) => {
    setSearchQuery(inputValue);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const renderFilters = (
    <Stack
      spacing={3}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-end', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
    >
      <ProductSearch
        query={debouncedQuery}
        results={searchResults}
        onSearch={handleSearch}
        loading={searchLoading}
        hrefItem={(id) => paths.product.details(id)}
      />

      <Stack direction="row" spacing={1} flexShrink={0}>
        <ProductFilters
          open={openFilters.value}
          onOpen={openFilters.onTrue}
          onClose={openFilters.onFalse}
          //
          filters={filters}
          onFilters={handleFilters}
          //
          canReset={canReset}
          onResetFilters={handleResetFilters}
          //
          colorOptions={PRODUCT_COLOR_OPTIONS}
          ratingOptions={PRODUCT_RATING_OPTIONS}
          genderOptions={PRODUCT_GENDER_OPTIONS}
          categoryOptions={['all', ...PRODUCT_CATEGORY_OPTIONS]}
        />

        <ProductSort sort={sortBy} onSort={handleSortBy} sortOptions={PRODUCT_SORT_OPTIONS} />
      </Stack>
    </Stack>
  );

  const renderResults = (
    <ProductFiltersResult
      filters={filters}
      onFilters={handleFilters}
      //
      canReset={canReset}
      onResetFilters={handleResetFilters}
      //
      results={dataFiltered.length}
    />
  );

  const renderNotFound = <EmptyContent filled title="No Data" sx={{ py: 10 }} />;

  return (
    <Container
      maxWidth={settings.themeStretch ? false : 'lg'}
      sx={{
        mb: 15,
      }}
    >
      <CartIcon totalItems={checkout.totalItems} />

      <Typography
        variant="h4"
        sx={{
          my: { xs: 3, md: 5 },
        }}
      >
        {categoryFromQuery
          ? `${decodeURIComponent(categoryFromQuery)} Products`
          : 'Shop'}
      </Typography>

      <Stack
        spacing={2.5}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      >
        {renderFilters}

        {canReset && renderResults}
      </Stack>

      {(notFound || productsEmpty) && renderNotFound}

      <ProductList products={dataFiltered} loading={productsLoading} />
    </Container>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, filters, sortBy }) {
  const { gender, category, colors, priceRange, rating } = filters;

  const min = priceRange[0];

  const max = priceRange[1];

  // SORT BY
  if (sortBy === 'featured') {
    inputData = orderBy(inputData, ['totalSold'], ['desc']);
  }

  if (sortBy === 'newest') {
    inputData = orderBy(inputData, ['createdAt'], ['desc']);
  }

  if (sortBy === 'priceDesc') {
    inputData = orderBy(inputData, ['price'], ['desc']);
  }

  if (sortBy === 'priceAsc') {
    inputData = orderBy(inputData, ['price'], ['asc']);
  }

  // FILTERS
  if (gender.length) {
    inputData = inputData.filter((product) => gender.includes(product.gender));
  }

  if (category !== 'all') {
    inputData = inputData.filter(
      (product) =>
        product.category === category ||
        product.categorySlug === paramCase(category) ||
        paramCase(product.category ?? '') === paramCase(category)
    );
  }

  if (colors.length) {
    inputData = inputData.filter((product) =>
      product.colors.some((color) => colors.includes(color))
    );
  }

  if (min !== 0 || max !== 200) {
    inputData = inputData.filter((product) => product.price >= min && product.price <= max);
  }

  if (rating) {
    inputData = inputData.filter((product) => {
      const convertRating = (value) => {
        if (value === 'up4Star') return 4;
        if (value === 'up3Star') return 3;
        if (value === 'up2Star') return 2;
        return 1;
      };
      return product.totalRatings > convertRating(rating);
    });
  }

  return inputData;
}
