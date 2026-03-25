import { Helmet } from 'react-helmet-async';
import PaymentStatusView from 'src/sections/payment-status/payment-status-view';

export default function PaymentCancelledPage() {
  return (
    <>
      <Helmet>
        <title>Payment Cancelled</title>
      </Helmet>

      <PaymentStatusView status="cancelled" />
    </>
  );
}
