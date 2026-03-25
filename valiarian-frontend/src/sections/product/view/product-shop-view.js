import isEqual from 'lodash/isEqual';
import { startTransition, useCallback, useState, useEffect, useMemo } from 'react';
// @mui
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';
import { useRouter, useSearchParams } from 'src/routes/hook';
// routes
import { paths } from 'src/routes/paths';
// utils
// _mock
import {
  PRODUCT_SORT_OPTIONS,
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
import ProductFiltersResult from '../product-filters-result';

// ----------------------------------------------------------------------

const defaultFilters = {
  gender: [],
  colors: [],
  rating: '',
  category: 'products',
  priceRange: [0, 200000],
};

const PRODUCTS_PER_PAGE = 20;

// ----------------------------------------------------------------------

export default function ProductShopView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromQuery = searchParams.get('category');
  const searchFromQuery = searchParams.get('search');
  const normalizedCategoryFromQuery = useMemo(() => {
    if (!categoryFromQuery) return 'products';

    const decodedCategory = decodeURIComponent(categoryFromQuery).trim();
    if (!decodedCategory) return 'products';

    return ['products', 'all'].includes(decodedCategory.toLowerCase())
      ? 'products'
      : decodedCategory;
  }, [categoryFromQuery]);
  const normalizedSearchFromQuery = useMemo(() => searchFromQuery?.trim() || '', [searchFromQuery]);

  const { checkout } = useCheckout();

  const openFilters = useBoolean();

  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState(normalizedSearchFromQuery);

  const debouncedQuery = useDebounce(searchQuery);

  const [filters, setFilters] = useState(() => ({
    ...defaultFilters,
    category: normalizedCategoryFromQuery,
  }));

  const { categories = [] } = useGetCategories(openFilters.value);

  const activeCategory = useMemo(() => {
    if (filters.category === 'all' || filters.category === 'products') return null;
    return categories.find(
      (c) =>
        c.id === filters.category ||
        c.slug === filters.category ||
        c.name === filters.category ||
        c.name?.toLowerCase() === String(filters.category).toLowerCase()
    );
  }, [categories, filters.category]);

  const productQueryFilters = useMemo(
    () => ({
      categorySlug:
        filters.category !== 'all' && filters.category !== 'products'
          ? activeCategory?.slug || filters.category
          : undefined,
      sortBy,
      limit: PRODUCTS_PER_PAGE,
      offset: (page - 1) * PRODUCTS_PER_PAGE,
    }),
    [activeCategory?.slug, filters.category, page, sortBy]
  );

  const { products, productsLoading, productsTotal } = useGetProducts(productQueryFilters);

  const activeSearchQuery =
    debouncedQuery === normalizedSearchFromQuery ? normalizedSearchFromQuery : debouncedQuery;

  const { searchResults, searchLoading } = useSearchProducts(activeSearchQuery);

  // Update filters when category query parameter changes from URL
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      category:
        prev.category === normalizedCategoryFromQuery
          ? prev.category
          : normalizedCategoryFromQuery,
    }));
  }, [normalizedCategoryFromQuery]);

  useEffect(() => {
    setSearchQuery(normalizedSearchFromQuery);
  }, [normalizedSearchFromQuery]);

  useEffect(() => {
    setPage(1);
  }, [filters.category, sortBy]);

  const handleFilters = useCallback((name, value) => {
    setFilters((prevState) => {
      if (prevState[name] === value) {
        return prevState;
      }

      return {
        ...prevState,
        [name]: value,
      };
    });
  }, []);

  const handleFilterCategory = useCallback(
    (event, newValue) => {
      handleFilters('category', newValue);
      router.replace(buildShopUrl(newValue, activeSearchQuery));
    },
    [activeSearchQuery, handleFilters, router]
  );

  const dataFiltered = useMemo(
    () =>
      applyFilter({
        inputData: products,
        filters,
        searchQuery: activeSearchQuery,
      }),
    [products, filters, activeSearchQuery]
  );

  const productsEmpty = !productsLoading && !dataFiltered.length;
  const useServerPagination = !activeSearchQuery;
  const totalPages = useMemo(() => {
    if (!useServerPagination) {
      return Math.max(1, Math.ceil(dataFiltered.length / PRODUCTS_PER_PAGE));
    }

    return Math.max(1, Math.ceil(productsTotal / PRODUCTS_PER_PAGE));
  }, [dataFiltered.length, productsTotal, useServerPagination]);

  const hasSearch = Boolean(activeSearchQuery);
  const canReset = !isEqual(defaultFilters, filters) || hasSearch;

  const notFound = !dataFiltered.length && canReset;

  const handleSortBy = useCallback((newValue) => {
    setSortBy(newValue);
  }, []);

  const handleSearch = useCallback((inputValue) => {
    startTransition(() => {
      setPage(1);
      setSearchQuery(inputValue);
    });
  }, []);

  useEffect(() => {
    if (searchQuery === normalizedSearchFromQuery) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      router.replace(buildShopUrl(filters.category, searchQuery));
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [filters.category, normalizedSearchFromQuery, router, searchQuery]);

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPage(1);
    setSearchQuery('');
    router.replace(paths.product.root);
  }, [router]);

  const handleClearSearch = useCallback(() => {
    setPage(1);
    setSearchQuery('');
    router.replace(buildShopUrl(filters.category, ''));
  }, [filters.category, router]);

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
        {/* <ProductFilters
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
        /> */}

        <ProductSort sort={sortBy} onSort={handleSortBy} sortOptions={PRODUCT_SORT_OPTIONS} />
      </Stack>
    </Stack>
  );

  const renderResults = (
    <ProductFiltersResult
      filters={filters}
      searchQuery={activeSearchQuery}
      onFilters={handleFilters}
      onClearSearch={handleClearSearch}
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
      {/* {categories.map((category) => (
        <Tab key={category.id} label={category.name} value={category.id} />
      ))} */}
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

      <ProductList
        products={dataFiltered}
        loading={productsLoading}
        page={useServerPagination ? page : undefined}
        totalPages={useServerPagination ? totalPages : undefined}
        onPageChange={useServerPagination ? setPage : undefined}
      />
    </Container>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, filters, searchQuery }) {
  const { gender, category, colors, priceRange, rating } = filters;

  const min = priceRange[0];

  const max = priceRange[1];

  if (searchQuery) {
    inputData = inputData.filter((product) => matchesSearch(product, searchQuery));
  }

  // FILTERS
  if (gender.length) {
    inputData = inputData.filter((product) => gender.includes(product.gender));
  }

  // Category filtering is handled by the API request in useGetProducts.
  // Re-filtering locally can hide valid results when the response shape differs
  // slightly, for example when only categoryId is present or the relation is not hydrated.

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

function buildShopUrl(category, search) {
  const params = new URLSearchParams();

  if (category && category !== 'products' && category !== 'all') {
    params.set('category', category);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const queryString = params.toString();

  return queryString ? `${paths.product.root}?${queryString}` : paths.product.root;
}

function normalizeSearchValue(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value = '') {
  return normalizeSearchValue(value).split(' ').filter(Boolean);
}

function levenshteinDistance(source = '', target = '') {
  if (source === target) {
    return 0;
  }

  if (!source.length) {
    return target.length;
  }

  if (!target.length) {
    return source.length;
  }

  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const substitutionCost = source[row - 1] === target[col - 1] ? 0 : 1;

      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost
      );
    }
  }

  return matrix[source.length][target.length];
}

function isFuzzyTokenMatch(queryToken, targetToken) {
  if (!queryToken || !targetToken) {
    return false;
  }

  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
    return true;
  }

  const distance = levenshteinDistance(queryToken, targetToken);
  const tolerance = queryToken.length >= 6 ? 2 : 1;

  return distance <= tolerance;
}

function matchesSearch(product, searchQuery) {
  const normalizedQuery = normalizeSearchValue(searchQuery);

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = normalizeSearchValue([
    product.name,
    product.category?.name,
    product.category?.slug,
    product.categoryId,
    product.shortDescription,
    product.subDescription,
    product.description,
  ].filter(Boolean).join(' '));

  if (searchableText.includes(normalizedQuery)) {
    return true;
  }

  const queryTokens = tokenize(normalizedQuery);
  const targetTokens = tokenize(searchableText);

  return queryTokens.every((queryToken) =>
    targetTokens.some((targetToken) => isFuzzyTokenMatch(queryToken, targetToken))
  );
}
