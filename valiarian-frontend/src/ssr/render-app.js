import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { StaticRouter } from 'react-router-dom/server';
import { SWRConfig } from 'swr';
import createEmotionCache from 'src/create-emotion-cache';
import { persistor } from 'src/redux/store';
import PublicSsrApp from './public-app';

function waitForPersistence() {
  if (persistor.getState().bootstrapped) return Promise.resolve();

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 1000);
    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  });
}

export async function renderPublicApp({location, swr}) {
  await waitForPersistence();

  const cache = createEmotionCache();
  const {extractCriticalToChunks, constructStyleTagsFromChunks} = createEmotionServer(cache);
  const helmetContext = {};

  const markup = renderToString(
    <CacheProvider value={cache}>
      <SWRConfig value={{fallback: swr, revalidateOnMount: false}}>
        <HelmetProvider context={helmetContext}>
          <StaticRouter location={location}>
            <PublicSsrApp />
          </StaticRouter>
        </HelmetProvider>
      </SWRConfig>
    </CacheProvider>
  );

  const emotionChunks = extractCriticalToChunks(markup);
  const styles = constructStyleTagsFromChunks(emotionChunks);
  const {helmet} = helmetContext;
  const head = [
    helmet?.title?.toString(),
    helmet?.priority?.toString(),
    helmet?.meta?.toString(),
    helmet?.link?.toString(),
    helmet?.script?.toString(),
    styles,
  ].filter(Boolean).join('\n');

  return {head, markup};
}
