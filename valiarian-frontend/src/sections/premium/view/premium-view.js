import { Box } from '@mui/material';
// sections
import ProductLuxurySection from '../countdown';
import FabricDetail from '../fabric-detail';
import SignatureHero from '../hero';
import OrderWithConfidenceSection from '../order-with-confidence';
import ReserveTodayDetail from '../reserve-today';
import StatementArrivalDetail from '../statement-arrival';
import WhatMakesPremiumSection from '../what-make-premium';
// import PremiumPoloViewer from '../polo-3d-view';

// ----------------------------------------------------------------------

export default function PremiumView() {
  return (
    <Box>
      {/* Hero Section */}
      <SignatureHero />
      <ProductLuxurySection />
      {/* <PremiumPoloViewer /> */}
      <FabricDetail />
      <StatementArrivalDetail />
      <WhatMakesPremiumSection />
      <OrderWithConfidenceSection />
      <ReserveTodayDetail />

      {/* Add your other sections here */}
    </Box>
  );
}
