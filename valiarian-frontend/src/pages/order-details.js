import { Helmet } from 'react-helmet-async';
// sections
import { OrderDetailsView } from 'src/sections/order/view';

// ----------------------------------------------------------------------

export default function OrderDetailsPage() {
  return (
    <>
      <Helmet>
        <title>Order Details | Valiarian</title>
      </Helmet>

      <OrderDetailsView />
    </>
  );
}
