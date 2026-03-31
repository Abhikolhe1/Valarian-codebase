import { Helmet } from 'react-helmet-async';
import ComingSoonView from 'src/sections/coming-soon/view';
// components

// ----------------------------------------------------------------------

export default function PremiumPage() {
  return (
    <>
      <Helmet>
        <title> Premium - Valiarian</title>
      </Helmet>

      <ComingSoonView />
    </>
  );
}
