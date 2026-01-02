import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
// components
import ProductItem from 'src/sections/product/product-item';

// ----------------------------------------------------------------------

export default function HomeNewArrivalsCard({ product, sx }) {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        p: { xs: 1, sm: 1.5 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      <Card
        sx={{
          width: '100%',
          borderRadius: 2,
          boxShadow: (theme) => theme.shadows[4],
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '& .add-cart-btn': {
            display: 'none',
          },
        }}
      >
        <ProductItem product={product} />
      </Card>
    </Box>
  );
}

HomeNewArrivalsCard.propTypes = {
  product: PropTypes.object,
  sx: PropTypes.object,
};

