// babel-preset-react-app requires an explicit build environment. The regular
// CRA build sets this internally, but this standalone webpack process does not.
process.env.NODE_ENV ||= 'production';
process.env.BABEL_ENV ||= process.env.NODE_ENV;

const webpack = require('webpack');
const config = require('../webpack.ssr.cjs');

webpack(config, (error, stats) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }

  const output = stats.toString({colors: true, chunks: false, modules: false});
  if (output) console.log(output);
  if (stats.hasErrors()) process.exitCode = 1;
});
