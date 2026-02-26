import { Helmet } from 'react-helmet-async';
// sections
import OrderTrackingView from 'src/sections/order/order-tracking-view';

// ----------------------------------------------------------------------

export default function OrderTrackingPage() {
  return (
    <>
      <Helmet>
        <title>Order Tracking</title>
      </Helmet>

      <OrderTrackingView />
    </>
  );
}
