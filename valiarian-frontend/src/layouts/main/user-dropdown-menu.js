import PropTypes from 'prop-types';
// @mui
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function UserDropdownMenu({ anchorEl, open, onClose, user }) {
  const router = useRouter();
  const { logout } = useAuthContext();

  const handleMenuItemClick = (path) => {
    onClose();
    if (path) {
      router.push(path);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      router.push(paths.auth.jwt.login);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    {
      label: 'Profile',
      icon: 'eva:person-fill',
      path: '/account/profile',
    },
    {
      label: 'User Settings',
      icon: 'eva:settings-2-fill',
      path: '/account/settings',
    },
    {
      label: 'Order History',
      icon: 'eva:file-text-fill',
      path: '/account/orders',
    },
    {
      label: 'Order Tracking',
      icon: 'eva:navigation-2-fill',
      path: '/account/tracking',
    },
    {
      label: 'Favorites',
      icon: 'eva:heart-fill',
      path: '/favorites',
    },
  ];

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          mt: 1.5,
          ml: 0.75,
          width: 200,
        },
      }}
    >
      {/* User Info */}
      {user && (
        <>
          <MenuItem disabled sx={{ py: 1.5 }}>
            <ListItemText
              primary={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
              secondary={user.email}
              primaryTypographyProps={{
                variant: 'subtitle2',
                noWrap: true,
              }}
              secondaryTypographyProps={{
                variant: 'caption',
                noWrap: true,
              }}
            />
          </MenuItem>
          <Divider sx={{ my: 1 }} />
        </>
      )}

      {/* Menu Items */}
      {menuItems.map((item) => (
        <MenuItem key={item.label} onClick={() => handleMenuItemClick(item.path)}>
          <ListItemIcon>
            <Iconify icon={item.icon} width={20} />
          </ListItemIcon>
          <ListItemText>{item.label}</ListItemText>
        </MenuItem>
      ))}

      <Divider sx={{ my: 1 }} />

      {/* Logout */}
      <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <Iconify icon="eva:log-out-fill" width={20} sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );
}

UserDropdownMenu.propTypes = {
  anchorEl: PropTypes.object,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  user: PropTypes.object,
};
