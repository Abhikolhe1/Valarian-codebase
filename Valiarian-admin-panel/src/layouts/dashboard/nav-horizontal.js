import { memo } from 'react';
// @mui
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
// theme
import { bgBlur } from 'src/theme/css';
// components
import { NavSectionHorizontal } from 'src/components/nav-section';
// auth
import { useAuthContext } from 'src/auth/hooks';
import { getUserPrimaryRole } from 'src/auth/utils/role';
//
import { HEADER } from '../config-layout';
import { useNavData } from './config-navigation';
import { filterNavGroupsByRole } from './nav-utils';
import { HeaderShadow } from '../_common';

// ----------------------------------------------------------------------

function NavHorizontal() {
  const theme = useTheme();

  const { user } = useAuthContext();
  const currentRole = getUserPrimaryRole(user);

  const navData = useNavData();
  const filteredNavData = filterNavGroupsByRole(navData, currentRole);

  return (
    <AppBar
      component="nav"
      sx={{
        top: HEADER.H_DESKTOP_OFFSET,
      }}
    >
      <Toolbar
        sx={{
          ...bgBlur({
            color: theme.palette.background.default,
          }),
        }}
      >
        <NavSectionHorizontal
          data={filteredNavData}
          config={{
            currentRole,
          }}
        />
      </Toolbar>

      <HeaderShadow />
    </AppBar>
  );
}

export default memo(NavHorizontal);
