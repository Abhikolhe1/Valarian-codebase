import { Suspense } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CacheProvider } from '@emotion/react';
import { SWRConfig } from 'swr';
//
import App from './App';
import createEmotionCache from './create-emotion-cache';
import { persistor } from './redux/store';
import { hasServerMarkup, readInitialData } from './ssr/initial-data';

// ----------------------------------------------------------------------

const rootElement = document.getElementById('root');
const shouldHydrate = hasServerMarkup(rootElement);
const initialData = readInitialData();
const emotionCache = createEmotionCache();

const application = (
  <CacheProvider value={emotionCache}>
    <SWRConfig
      value={{
        fallback: initialData.swr || {},
        revalidateOnMount: shouldHydrate ? false : undefined,
      }}
    >
      <HelmetProvider>
        <BrowserRouter>
          <Suspense>
            <App />
          </Suspense>
        </BrowserRouter>
      </HelmetProvider>
    </SWRConfig>
  </CacheProvider>
);

function mountApplication() {
  if (shouldHydrate) {
    hydrateRoot(rootElement, application);
    return;
  }

  createRoot(rootElement).render(application);
}

if (shouldHydrate && !persistor.getState().bootstrapped) {
  const unsubscribe = persistor.subscribe(() => {
    if (persistor.getState().bootstrapped) {
      unsubscribe();
      mountApplication();
    }
  });
} else {
  mountApplication();
}
