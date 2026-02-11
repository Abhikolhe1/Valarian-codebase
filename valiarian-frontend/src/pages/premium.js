import { Helmet } from 'react-helmet-async';
// components
import PremiumView from 'src/sections/premium/view';

// ----------------------------------------------------------------------

export default function PremiumPage() {
  return (
    <>
      <Helmet>
        <title> Premium - Valiarian</title>
      </Helmet>

      <PremiumView />
    </>
  );
}
