import { Helmet } from 'react-helmet-async';
import PremiumOrderDetailsView from 'src/sections/premium-orders/view/premium-order-details-view';

export default function PremiumOrderDetailsPage() {
  return (
    <>
      <Helmet>
        <title>Premium Order Details | Valiarian Admin</title>
      </Helmet>

      <PremiumOrderDetailsView />
    </>
  );
}
