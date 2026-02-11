import { Box } from '@mui/material';
// sections
import SignatureHero from '../hero';
import ProductLuxurySection from '../countdown';
import FabricDetail from '../fabric-detail';
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

      {/* Add your other sections here */}
    </Box>
  );
}
