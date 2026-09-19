import PropTypes from 'prop-types';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ReduxProvider from 'src/redux/redux-provider';
import ThemeProvider from 'src/theme';
import MotionLazy from 'src/components/animate/motion-lazy';
import CartInitializer from 'src/components/cart-initializer';
import ErrorBoundary from 'src/components/error-boundary';
import FavoritesInitializer from 'src/components/favorites-initializer';
import ProgressBar from 'src/components/progress-bar';
import { SettingsDrawer, SettingsProvider } from 'src/components/settings';
import SnackbarProvider from 'src/components/snackbar/snackbar-provider';
import { AuthProvider } from 'src/auth/context/jwt';
import QueryProvider from 'src/api/query-provider';
import { SiteSettingsProvider } from 'src/contexts/SiteSettingsContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ReduxProvider>
        <QueryProvider>
          <SiteSettingsProvider>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <SettingsProvider
                defaultSettings={{
                  themeMode: 'light',
                  themeDirection: 'ltr',
                  themeContrast: 'default',
                  themeLayout: 'vertical',
                  themeColorPresets: 'default',
                  themeStretch: false,
                }}
              >
                <ThemeProvider>
                  <MotionLazy>
                    <SnackbarProvider>
                      <ErrorBoundary>
                        <SettingsDrawer />
                        <ProgressBar />
                        <CartInitializer>
                          <FavoritesInitializer>{children}</FavoritesInitializer>
                        </CartInitializer>
                      </ErrorBoundary>
                    </SnackbarProvider>
                  </MotionLazy>
                </ThemeProvider>
              </SettingsProvider>
            </LocalizationProvider>
          </SiteSettingsProvider>
        </QueryProvider>
      </ReduxProvider>
    </AuthProvider>
  );
}

AppProviders.propTypes = {
  children: PropTypes.node,
};
