import { Helmet } from 'react-helmet-async';
import PaymentStatusView from 'src/sections/payment-status/payment-status-view';

export default function PaymentPendingPage() {
  return (
    <>
      <Helmet>
        <title>Payment Pending</title>
      </Helmet>

      <PaymentStatusView status="pending" />
    </>
  );
}
