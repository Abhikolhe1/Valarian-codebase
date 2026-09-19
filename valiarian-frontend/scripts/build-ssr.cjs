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
