import { Helmet } from 'react-helmet-async';
// sections
import OrderConfirmationView from 'src/sections/order/order-confirmation-view';

// ----------------------------------------------------------------------

export default function OrderConfirmationPage() {
  return (
    <>
      <Helmet>
        <title>Order Confirmation | Valiarian</title>
      </Helmet>

      <OrderConfirmationView />
    </>
  );
}
