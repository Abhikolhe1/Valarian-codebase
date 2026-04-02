import { Helmet } from 'react-helmet-async';
import ComingSoonView from 'src/sections/coming-soon/view';
import PremiumView from 'src/sections/premium/view';
// components

// ----------------------------------------------------------------------

export default function PremiumPage() {
  return (
    <>
      <Helmet>
        <title> Premium - Valiarian</title>
      </Helmet>

      {/* <ComingSoonView /> */}
      <PremiumView/>
    </>
  );
}
