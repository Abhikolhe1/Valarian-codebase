import { Helmet } from 'react-helmet-async';
// sections
import OrderHistoryView from 'src/sections/order/order-history-view';

// ----------------------------------------------------------------------

export default function OrderHistoryPage() {
  return (
    <>
      <Helmet>
        <title>Order History</title>
      </Helmet>

      <OrderHistoryView />
    </>
  );
}
