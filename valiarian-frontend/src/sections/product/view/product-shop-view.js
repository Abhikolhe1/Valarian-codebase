import orderBy from 'lodash/orderBy';
import isEqual from 'lodash/isEqual';
import { useCallback, useState, useEffect, useMemo } from 'react';
// @mui
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';
import { useSearchParams } from 'src/routes/hook';
// routes
import { paths } from 'src/routes/paths';
// utils
// _mock
import {
  PRODUCT_SORT_OPTIONS,
  PRODUCT_COLOR_OPTIONS,
  PRODUCT_GENDER_OPTIONS,
  PRODUCT_RATING_OPTIONS,
} from 'src/_mock';
// api
import { useGetProducts, useSearchProducts } from 'src/api/product';
import { useGetCategories } from 'src/api/category';
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
  category: 'products',
  priceRange: [0, 200000],
};

// ----------------------------------------------------------------------

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

  const { categories } = useGetCategories();

  const activeCategory = useMemo(() => {
    if (filters.category === 'all' || filters.category === 'products') return null;
    return categories.find(
      (c) =>
        c.id === filters.category ||
        c.slug === filters.category ||
        c.name === filters.category
    );
  }, [categories, filters.category]);

  const { products, productsLoading } = useGetProducts({
    categoryId: activeCategory?.id,
    categorySlug: !activeCategory && filters.category !== 'all' && filters.category !== 'products'
      ? filters.category
      : activeCategory?.slug,
  });

  const productsEmpty = !productsLoading && products.length === 0;

  const { searchResults, searchLoading } = useSearchProducts(debouncedQuery);

  // Update filters when category query parameter changes from URL
  useEffect(() => {
    if (!categoryFromQuery) return;

    const categoryValue = decodeURIComponent(categoryFromQuery);
    const foundCategory = categories.find(
      (c) =>
        c.id === categoryValue ||
        c.slug === categoryValue ||
        c.name?.toLowerCase() === categoryValue.toLowerCase()
    );

    setFilters((prev) => ({
      ...prev,
      category:
        categoryValue.toLowerCase() === 'products' || categoryValue.toLowerCase() === 'all'
          ? 'products'
          : foundCategory?.id || categoryValue,
    }));
  }, [categoryFromQuery, categories]);

  useEffect(() => {
    if (categoryFromQuery) return;

    setFilters((prev) => {
      if (prev.category === 'products') return prev;

      return {
        ...prev,
        category: 'products',
      };
    });
  }, [categoryFromQuery]);

  const handleFilters = useCallback((name, value) => {
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);

  const handleFilterCategory = useCallback(
    (event, newValue) => {
      handleFilters('category', newValue);
    },
    [handleFilters]
  );

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
          categories={categories}
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
      categories={categories}
    />
  );

  const renderTabs = (
    <Tabs
      value={filters.category}
      onChange={handleFilterCategory}
      sx={{
        mb: { xs: 3, md: 5 },
      }}
    >
      <Tab key="products" label="Products" value="products" />
      {categories.map((category) => (
        <Tab key={category.id} label={category.name} value={category.id} />
      ))}
    </Tabs>
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
        Shop
      </Typography>

      {renderTabs}

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
    inputData = orderBy(inputData, ['soldCount'], ['desc']);
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

  // Backend already handles category filtering if it was passed to useGetProducts
  // But if we have local products or want extra safety:
  if (category !== 'all' && category !== 'products') {
    inputData = inputData.filter(
      (product) =>
        product.categoryId === category ||
        product.category?.id === category ||
        product.category?.slug === category ||
        product.category?.name === category
    );
  }

  if (colors.length) {
    inputData = inputData.filter((product) =>
      product.colors.some((color) => colors.includes(color))
    );
  }

  if (min !== 0 || max !== 200000) {
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
      return product.rating >= convertRating(rating);
    });
  }

  return inputData;
}
