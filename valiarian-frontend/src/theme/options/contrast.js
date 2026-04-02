import { palette } from '../palette';
import { customShadows } from '../custom-shadows';

// ----------------------------------------------------------------------

export function contrast(contrastBold, mode, themeOverrides = {}) {
  const theme = {
    ...(contrastBold &&
      mode === 'light' && {
        palette: {
          background: {
            default: palette(mode, themeOverrides).grey[100],
          },
        },
      }),
  };

  const components = {
    ...(contrastBold && {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: customShadows(mode, themeOverrides).z4,
          },
        },
      },
    }),
  };

  return {
    theme,
    components,
  };
}
