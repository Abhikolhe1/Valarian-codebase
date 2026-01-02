import PropTypes from 'prop-types';
import { useEffect } from 'react';
// @mui
import List from '@mui/material/List';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// routes
import { usePathname } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// components
import Logo from 'src/components/logo';
import SvgColor from 'src/components/svg-color';
import Scrollbar from 'src/components/scrollbar';
import Iconify from 'src/components/iconify';
// contexts
import { useMobileMenu } from 'src/contexts/mobile-menu-context';
//
import NavList from './nav-list';
import NavItem from './nav-item';

// ----------------------------------------------------------------------

export default function NavMobile({ offsetTop, data, isTransparent }) {
  const pathname = usePathname();
  const { setIsMenuOpen } = useMobileMenu();

  const nav = useBoolean();

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
            {data
              .filter((link) => !['Components', 'Pages', 'Docs'].includes(link.title))
              .map((link) => (
                <NavList key={link.title} item={link} />
              ))}
            
            {/* Additional menu items - Mobile only */}
            <NavItem
              item={{
                title: 'Categories',
                path: paths.product.root,
                icon: <Iconify icon="eva:grid-fill" />,
              }}
              active={pathname === paths.product.root}
            />
            <NavItem
              item={{
                title: 'Premium',
                path: paths.pricing,
                icon: <Iconify icon="eva:star-fill" />,
              }}
              active={pathname === paths.pricing}
            />
            <NavItem
              item={{
                title: 'About Us',
                path: paths.about,
                icon: <Iconify icon="eva:info-fill" />,
              }}
              active={pathname === paths.about}
            />
            <Divider sx={{ my: 1 }} />
            <NavItem
              item={{
                title: 'Profile',
                path: paths.dashboard.user.profile,
                icon: <Iconify icon="eva:person-fill" />,
              }}
              active={pathname === paths.dashboard.user.profile}
            />
          </List>
        </Scrollbar>
        
        <Logo sx={{ mx: 2.5, my: 3, flexShrink: 0 }} />
      </Drawer>
    </>
  );
}

NavMobile.propTypes = {
  data: PropTypes.array,
  offsetTop: PropTypes.bool,
  isTransparent: PropTypes.bool,
};
