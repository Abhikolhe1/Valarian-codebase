import PropTypes from 'prop-types';
import { Fragment, useEffect, useMemo } from 'react';
// @mui
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useMobileNavigation } from 'src/layouts/main/hooks/use-mobile-navigation';
// routes
import { usePathname, useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// components
import Iconify from 'src/components/iconify';
import Logo from 'src/components/logo';
import Scrollbar from 'src/components/scrollbar';
import SvgColor from 'src/components/svg-color';
// contexts
import { useMobileMenu } from 'src/contexts/mobile-menu-context';
//
import { useAuthContext } from 'src/auth/hooks';
import NavList from './nav-list';
import NavMobileCategories from './nav-mobile-categories';

// ----------------------------------------------------------------------

export default function NavMobile({ offsetTop, isTransparent }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, userLogout } = useAuthContext();
  const { setIsMenuOpen } = useMobileMenu();

  const nav = useBoolean();
  const categories = useBoolean();

  // Fetch mobile navigation from CMS or default
  const { navigation: mobileNavigation } = useMobileNavigation();

  const displayedNavigation = useMemo(() => {
    const authTitles = ['Profile', 'Order History', 'Favorites'];
    const publicLinks = mobileNavigation.filter((link) => !authTitles.includes(link.title));

    if (user) {
      return mobileNavigation;
    }

    return [
      ...publicLinks,
      {
        title: 'Login',
        path: paths.auth.jwt.login,
        icon: <Iconify icon="eva:log-in-fill" />,
      },
    ];
  }, [mobileNavigation, user]);

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

  const handleOpenCategories = () => {
    nav.onFalse();
    categories.onTrue();
  };

  const handleLogout = async () => {
    try {
      if (userLogout) {
        await userLogout();
      } else {
        await logout();
      }
      nav.onFalse();
      router.push(paths.auth.jwt.login);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
            {displayedNavigation.map((link) => (
              <Fragment key={link.title}>
                {(link.title === 'Profile' || link.title === 'Login') && <Divider sx={{ my: 1 }} />}
                <NavList
                  item={link}
                  onOpenCategories={link.title === 'Categories' ? handleOpenCategories : undefined}
                />
              </Fragment>
            ))}
            {user && (
              <>
                <Divider sx={{ my: 1 }} />
                <NavList
                  item={{
                    title: 'Logout',
                    path: '#',
                    icon: <Iconify icon="eva:log-out-fill" />,
                    onClick: handleLogout,
                  }}
                />
              </>
            )}
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
