import { Helmet } from 'react-helmet-async';
import PremiumPreorderDetailsView from 'src/sections/order/view/premium-preorder-details-view';

export default function PremiumOrderDetailsPage() {
  return (
    <>
      <Helmet>
        <title>Premium Preorder Details</title>
      </Helmet>

      <PremiumPreorderDetailsView />
    </>
  );
}
