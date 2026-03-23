import PropTypes from 'prop-types';
import { memo, useEffect, useMemo, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Pagination, { paginationClasses } from '@mui/material/Pagination';
//
import ProductItem from './product-item';
import { ProductItemSkeleton } from './product-skeleton';

// ----------------------------------------------------------------------

const PRODUCTS_PER_PAGE = 20;
const SKELETON_COUNT = 12;

function ProductList({ products, loading, ...other }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [products]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((products?.length || 0) / PRODUCTS_PER_PAGE)),
    [products]
  );

  const visibleProducts = useMemo(() => {
    const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
    return products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [page, products]);

  const renderSkeleton = useMemo(
    () => (
      <>
        {[...Array(SKELETON_COUNT)].map((_, index) => (
          <ProductItemSkeleton key={index} />
        ))}
      </>
    ),
    []
  );

  const renderList = useMemo(
    () => (
      <>
        {visibleProducts.map((product) => (
          <ProductItem key={product.id} product={product} />
        ))}
      </>
    ),
    [visibleProducts]
  );

  return (
    <>
      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        }}
        {...other}
      >
        {loading ? renderSkeleton : renderList}
      </Box>

      {!loading && totalPages > 1 && (
        <Pagination
          page={page}
          count={totalPages}
          onChange={(_, value) => setPage(value)}
          sx={{
            mt: 8,
            [`& .${paginationClasses.ul}`]: {
              justifyContent: 'center',
            },
          }}
        />
      )}
    </>
  );
}

ProductList.propTypes = {
  loading: PropTypes.bool,
  products: PropTypes.array,
};

export default memo(ProductList);
