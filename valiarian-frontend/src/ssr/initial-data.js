export const INITIAL_DATA_GLOBAL = '__VALIARIAN_INITIAL_DATA__';

export function readInitialData() {
  if (typeof window === 'undefined') return {};
  return window[INITIAL_DATA_GLOBAL] || {};
}

export function hasServerMarkup(rootElement) {
  return rootElement?.dataset?.ssr === 'true' && rootElement.hasChildNodes();
}
