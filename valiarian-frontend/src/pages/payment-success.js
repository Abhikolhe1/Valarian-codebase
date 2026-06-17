import { Helmet } from 'react-helmet-async';
import PaymentStatusView from 'src/sections/payment-status/payment-status-view';

export default function PaymentSuccessPage() {
  return (
    <>
      <Helmet>
        <title>Payment Successful</title>
      </Helmet>

      <PaymentStatusView status="success" />
    </>
  );
}
