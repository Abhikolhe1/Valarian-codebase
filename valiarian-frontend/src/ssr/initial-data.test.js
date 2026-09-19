import { hasServerMarkup, readInitialData } from './initial-data';

describe('SSR hydration bootstrap', () => {
  afterEach(() => {
    delete window.__VALIARIAN_INITIAL_DATA__;
    document.body.innerHTML = '';
  });

  it('hydrates only roots explicitly rendered by the SSR service', () => {
    document.body.innerHTML = '<div id="root" data-ssr="true"><main>Rendered</main></div>';
    expect(hasServerMarkup(document.getElementById('root'))).toBe(true);

    document.body.innerHTML = '<div id="root"></div>';
    expect(hasServerMarkup(document.getElementById('root'))).toBe(false);
  });

  it('reuses the safely embedded SWR fallback', () => {
    window.__VALIARIAN_INITIAL_DATA__ = {swr: {'/api/example': {id: 'example'}}};
    expect(readInitialData()).toEqual(window.__VALIARIAN_INITIAL_DATA__);
  });
});
