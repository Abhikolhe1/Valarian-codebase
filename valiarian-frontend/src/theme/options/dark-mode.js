import { palette } from '../palette';
import { shadows } from '../shadows';
import { customShadows } from '../custom-shadows';

// ----------------------------------------------------------------------

export function darkMode(mode, themeOverrides = {}) {
  const theme = {
    palette: palette(mode, themeOverrides),
    shadows: shadows(mode),
    customShadows: customShadows(mode, themeOverrides),
  };

  return theme;
}
