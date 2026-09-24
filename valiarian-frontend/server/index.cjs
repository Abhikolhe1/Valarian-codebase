const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const express = require('express');
const {loadInitialData, matchPublicRoute} = require('./data-loader.cjs');
const {renderPublicApp} = require('../server-build/render-app.cjs');

const app = express();
const port = Number(process.env.SSR_PORT || 3100);
const apiOrigin = (process.env.SSR_API_ORIGIN || 'http://127.0.0.1:3035').replace(/\/$/, '');
const buildDir = path.resolve(process.env.SSR_BUILD_DIR || path.join(__dirname, '..', 'build'));
const templatePath = path.join(buildDir, 'index.html');

function serialize(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escapes = {'<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029'};
    return escapes[character];
  });
}

function applyDocument(template, {head, markup, initialData}) {
  const withoutManagedHead = template
    .replace(/<title[^>]*data-rh=["']true["'][^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]*data-rh=["']true["'][^>]*>/gi, '')
    .replace(/<link[^>]*data-rh=["']true["'][^>]*>/gi, '')
    .replace(/<script[^>]*id=["']seo-route-structured-data["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const withHead = withoutManagedHead.replace('</head>', `${head}\n</head>`);
  const stateScript = `<script>window.__VALIARIAN_INITIAL_DATA__=${serialize(initialData)};</script>`;
  return withHead.replace(
    '<div id="root"></div>',
    `<div id="root" data-ssr="true">${markup}</div>${stateScript}`
  );
}

function fallbackDocument(template) {
  return template.replace(
    '<div id="root"></div>',
    '<div id="root"><main><h1>Valiarian is temporarily unavailable</h1><p>Please refresh in a moment.</p></main></div>'
  );
}

app.get('/health', (_request, response) => {
  response.json({status: 'ok', renderer: 'valiarian-react-ssr'});
});

app.use(express.static(buildDir, {index: false, fallthrough: true}));

app.get('*', async (request, response) => {
  const route = matchPublicRoute(request.path);
  if (!route) {
    response.status(404).send('Not found');
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  try {
    const initialData = await loadInitialData(apiOrigin, request.path);
    const rendered = await renderPublicApp({location: request.originalUrl, swr: initialData.swr});
    response
      .status(initialData.status)
      .set('Cache-Control', 'no-store')
      .send(applyDocument(template, {...rendered, initialData: {swr: initialData.swr}}));
  } catch (error) {
    console.error(`[SSR] ${request.originalUrl} failed`, error);
    response.status(503).set('Cache-Control', 'no-store').send(fallbackDocument(template));
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Valiarian React SSR listening at http://127.0.0.1:${port}`);
});
