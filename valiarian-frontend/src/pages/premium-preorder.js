import { Helmet } from 'react-helmet-async';
import PremiumPreorderCheckoutView from 'src/sections/premium/view/premium-preorder-checkout-view';

export default function PremiumPreorderPage() {
  return (
    <>
      <Helmet>
        <title>Premium Preorder | Valiarian</title>
      </Helmet>

      <PremiumPreorderCheckoutView />
    </>
  );
}
