import { Helmet } from 'react-helmet-async';
// sections
import OrderDetailsView from 'src/sections/orders/order-details-view';

// ----------------------------------------------------------------------

export default function OrderDetailsPage() {
  return (
    <>
      <Helmet>
        <title>Order Details | Valiarian Admin</title>
      </Helmet>

      <OrderDetailsView />
    </>
  );
}
