import PropTypes from 'prop-types';
// @mui
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
// components
import Scrollbar from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';
//
import CheckoutCartProduct from './checkout-cart-product';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'product', label: 'Product' },
  { id: 'price', label: 'Price' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'totalAmount', label: 'Total Price', align: 'right' },
  { id: '' },
];

// ----------------------------------------------------------------------

export default function CheckoutCartProductList({
  products,
  onDelete,
  onIncreaseQuantity,
  onDecreaseQuantity,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Mobile: a stack of self-contained cards — the table below forces a
  // 720px minWidth, which on a phone just pushes price/quantity off-screen
  // behind a horizontal scroll (reported UX issue). No Table/Scrollbar at
  // all here, so there's nothing to scroll sideways.
  if (isMobile) {
    return (
      <Stack spacing={1.5} sx={{ px: 2, pb: 2 }}>
        {products.map((row) => (
          <CheckoutCartProduct
            key={row.key || row.cartItemId || row.id}
            row={row}
            isMobile
            onDelete={() => onDelete(row.key || row.cartItemId || row.id)}
            onDecrease={() => onDecreaseQuantity(row.key || row.cartItemId || row.id)}
            onIncrease={() => onIncreaseQuantity(row.key || row.cartItemId || row.id)}
          />
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer sx={{ overflow: 'unset' }}>
      <Scrollbar>
        <Table sx={{ minWidth: 720 }}>
          <TableHeadCustom headLabel={TABLE_HEAD} />

          <TableBody>
            {products.map((row) => (
              <CheckoutCartProduct
                key={row.key || row.cartItemId || row.id}
                row={row}
                onDelete={() => onDelete(row.key || row.cartItemId || row.id)}
                onDecrease={() => onDecreaseQuantity(row.key || row.cartItemId || row.id)}
                onIncrease={() => onIncreaseQuantity(row.key || row.cartItemId || row.id)}
              />
            ))}
          </TableBody>
        </Table>
      </Scrollbar>
    </TableContainer>
  );
}

CheckoutCartProductList.propTypes = {
  onDelete: PropTypes.func,
  products: PropTypes.array,
  onDecreaseQuantity: PropTypes.func,
  onIncreaseQuantity: PropTypes.func,
};
