export const INITIAL_DATA_GLOBAL = '__VALIARIAN_INITIAL_DATA__';

export function readInitialData() {
  if (typeof window === 'undefined') return {};
  return window[INITIAL_DATA_GLOBAL] || {};
}

export function createClientSWRConfig(initialData = {}) {
  return {
    fallback: initialData.swr || {},
  };
}

export function hasInitialSWRKeys(initialData, keys) {
  const fallback = initialData?.swr;

  return (
    Boolean(fallback) &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(fallback, key))
  );
}

export function hasServerMarkup(rootElement) {
  return rootElement?.dataset?.ssr === 'true' && rootElement.hasChildNodes();
}
