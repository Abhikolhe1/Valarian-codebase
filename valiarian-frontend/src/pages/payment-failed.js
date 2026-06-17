import { Helmet } from 'react-helmet-async';
import PaymentStatusView from 'src/sections/payment-status/payment-status-view';

export default function PaymentFailedPage() {
  return (
    <>
      <Helmet>
        <title>Payment Failed</title>
      </Helmet>

      <PaymentStatusView status="failed" />
    </>
  );
}
