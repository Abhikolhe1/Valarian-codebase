const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const loaderSource = fs.readFileSync(
  path.join(__dirname, '..', 'valiarian-frontend', 'public', 'site-settings.js'),
  'utf8'
);

async function runScenario({hostname, gaId = '', gtmId = '', runs = 1}) {
  const elementsById = new Map();
  const headChildren = [];
  const bodyChildren = [];

  const createElement = (tagName) => ({
    tagName: tagName.toUpperCase(),
    style: {},
    setAttribute(name, value) {
      this[name] = value;
    },
    appendChild(child) {
      this.children = this.children || [];
      this.children.push(child);
    },
  });

  const append = (collection, element) => {
    collection.push(element);
    if (element.id) elementsById.set(element.id, element);
  };

  const document = {
    title: '',
    head: {appendChild: (element) => append(headChildren, element)},
    body: {
      firstChild: null,
      insertBefore: (element) => append(bodyChildren, element),
    },
    createElement,
    getElementById: (id) => elementsById.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  const window = {
    location: {hostname},
    dispatchEvent: () => {},
  };

  const context = vm.createContext({
    window,
    document,
    fetch: async () => ({ok: true, json: async () => ({gaId, gtmId})}),
    console: {log: () => {}, warn: () => {}},
    CustomEvent: function CustomEvent() {},
    URLSearchParams,
    Set,
    Date,
    encodeURIComponent,
  });

  for (let index = 0; index < runs; index += 1) {
    vm.runInContext(loaderSource, context);
    await new Promise((resolve) => setImmediate(resolve));
  }

  return headChildren.filter((element) => element.id).map(({id, src}) => ({id, src}));
}

(async () => {
  assert.deepStrictEqual(await runScenario({hostname: 'valiarian.com'}), []);

  const gaOnly = await runScenario({hostname: 'valiarian.com', gaId: 'G-ABC1234567'});
  assert.strictEqual(gaOnly.length, 1);
  assert.strictEqual(gaOnly[0].id, 'valiarian-ga4-script');

  const gtmOnly = await runScenario({hostname: 'valiarian.com', gtmId: 'GTM-ABC1234'});
  assert.strictEqual(gtmOnly.length, 1);
  assert.strictEqual(gtmOnly[0].id, 'valiarian-gtm-script');

  const both = await runScenario({
    hostname: 'valiarian.com',
    gaId: 'G-ABC1234567',
    gtmId: 'GTM-ABC1234',
  });
  assert.deepStrictEqual(both.map(({id}) => id), ['valiarian-gtm-script']);

  assert.deepStrictEqual(
    await runScenario({hostname: 'valiarian.com', gaId: "G-ABC';alert(1)//"}),
    []
  );
  assert.deepStrictEqual(
    await runScenario({hostname: 'valiarian.com', gtmId: '<script>alert(1)</script>'}),
    []
  );
  assert.deepStrictEqual(
    await runScenario({hostname: 'uat.valiarian.com', gaId: 'G-ABC1234567'}),
    []
  );
  assert.deepStrictEqual(
    await runScenario({hostname: 'localhost', gtmId: 'GTM-ABC1234'}),
    []
  );

  const repeated = await runScenario({
    hostname: 'www.valiarian.com',
    gaId: 'G-ABC1234567',
    runs: 2,
  });
  assert.strictEqual(repeated.length, 1);

  console.log('PASS analytics loader validation, precedence, isolation, and deduplication');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
