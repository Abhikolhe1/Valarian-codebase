import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
// routes
import { usePathname } from 'src/routes/hook';
// contexts
import { MobileMenuProvider } from 'src/contexts/mobile-menu-context';
//
import Footer from './footer';
import Header from './header';
import OfferMarquee from './offer-marquee';

// ----------------------------------------------------------------------

export default function MainLayout({ children }) {
  const pathname = usePathname();

  const isHome = pathname === '/';

  return (
    <MobileMenuProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: 1 }}>
        <OfferMarquee />
        <Header />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            // pt covers the fixed Header's own height (H_MOBILE/H_DESKTOP,
            // matching Header's own mdUp breakpoint split), but was missing
            // the OfferMarquee bar stacked above it (32px on xs/sm, 36px on
            // md+ — see offer-marquee.js / header.js's marqueeHeight). The
            // marquee is always visible at scrollY 0 (useMarqueeVisibility
            // defaults true and re-shows near the top), which is exactly
            // page-load state — so page content started underneath it,
            // clipping anything sitting close to the top (e.g. Checkout's
            // title). +32 / +36 accounts for that.
            ...(!isHome && {
              pt: { xs: 12, md: 14.5 },
            }),
          }}
        >
          {children}
        </Box>

        <Footer />
      </Box>
    </MobileMenuProvider>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node,
};
