import PropTypes from 'prop-types';
import { useEffect, useMemo, Fragment } from 'react';
// @mui
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useMobileNavigation } from 'src/layouts/main/hooks/use-mobile-navigation';
// routes
import { usePathname } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// api
import { useGetCategoryTree } from 'src/api/category';
// components
import Iconify from 'src/components/iconify';
import Logo from 'src/components/logo';
import Scrollbar from 'src/components/scrollbar';
import SvgColor from 'src/components/svg-color';
// contexts
import { useMobileMenu } from 'src/contexts/mobile-menu-context';
//
import NavList from './nav-list';
import NavMobileCategories from './nav-mobile-categories';

// ----------------------------------------------------------------------

export default function NavMobile({ offsetTop, isTransparent }) {
  const pathname = usePathname();
  const { setIsMenuOpen } = useMobileMenu();

  const nav = useBoolean();
  const categories = useBoolean();

  // Fetch mobile navigation from CMS or default
  const { navigation: mobileNavigation } = useMobileNavigation();

  // Sync menu state with context
  useEffect(() => {
    setIsMenuOpen(nav.value);
  }, [nav.value, setIsMenuOpen]);

  useEffect(() => {
    if (nav.value) {
      nav.onFalse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <IconButton
        onClick={nav.onTrue}
        sx={{
          ml: 1,
          color: isTransparent ? 'common.white' : 'text.primary',
        }}
      >
        <SvgColor src="/assets/icons/navbar/ic_menu_item.svg" />
      </IconButton>

      <Drawer
        open={nav.value}
        onClose={nav.onFalse}
        PaperProps={{
          sx: {
            pb: 5,
            width: 260,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Scrollbar sx={{ flex: 1 }}>
          <List component="nav" disablePadding>
            {mobileNavigation.map((link) => (
              <Fragment key={link.title}>
                {link.title === 'Profile' && <Divider sx={{ my: 1 }} />}
                <NavList
                  item={link}
                  onOpenCategories={link.title === 'Categories' ? categories.onTrue : undefined}
                />
              </Fragment>
            ))}
          </List>
        </Scrollbar>

        <Logo sx={{ mx: 2.5, my: 3, flexShrink: 0 }} />
      </Drawer>

      <NavMobileCategories open={categories.value} onClose={categories.onFalse} />
    </>
  );
}

NavMobile.propTypes = {
  offsetTop: PropTypes.bool,
  isTransparent: PropTypes.bool,
};
