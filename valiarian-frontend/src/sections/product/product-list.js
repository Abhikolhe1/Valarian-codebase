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

function ProductList({ products, loading, page, totalPages, onPageChange, ...other }) {
  const [localPage, setLocalPage] = useState(1);
  const isControlledPagination =
    typeof page === 'number' && typeof totalPages === 'number' && typeof onPageChange === 'function';

  useEffect(() => {
    if (isControlledPagination) {
      return undefined;
    }

    setLocalPage(1);
    return undefined;
  }, [isControlledPagination, products]);

  const localTotalPages = useMemo(
    () => Math.max(1, Math.ceil((products?.length || 0) / PRODUCTS_PER_PAGE)),
    [products]
  );

  const visibleProducts = useMemo(() => {
    if (isControlledPagination) {
      return products;
    }

    const startIndex = (localPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [isControlledPagination, localPage, products]);

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
        gap={{ xs: 1, md: 3 }}
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        }}
        {...other}
      >
        {loading ? renderSkeleton : renderList}
      </Box>

      {!loading && (isControlledPagination ? totalPages : localTotalPages) > 1 && (
        <Pagination
          page={isControlledPagination ? page : localPage}
          count={isControlledPagination ? totalPages : localTotalPages}
          onChange={(_, value) => {
            if (isControlledPagination) {
              onPageChange(value);
              return;
            }

            setLocalPage(value);
          }}
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
  onPageChange: PropTypes.func,
  page: PropTypes.number,
  products: PropTypes.array,
  totalPages: PropTypes.number,
};

export default memo(ProductList);
