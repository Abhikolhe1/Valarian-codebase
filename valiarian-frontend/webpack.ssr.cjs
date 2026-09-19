const path = require('path');

module.exports = {
  mode: 'production',
  target: 'node18',
  entry: path.resolve(__dirname, 'src/ssr/render-app.js'),
  output: {
    path: path.resolve(__dirname, 'server-build'),
    filename: 'render-app.cjs',
    chunkFilename: '[name].ssr-chunk.cjs',
    library: {type: 'commonjs2'},
    publicPath: '/',
    clean: true,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      'react-quill$': path.resolve(__dirname, 'server/stubs/react-quill.js'),
    },
    extensions: ['.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [[require.resolve('babel-preset-react-app'), {runtime: 'automatic'}]],
          },
        },
      },
      {test: /\.(css|scss|sass|less)$/i, type: 'asset/source'},
      {test: /\.(png|jpe?g|gif|svg|webp|woff2?)$/i, type: 'asset/resource'},
    ],
  },
  optimization: {minimize: false},
  devtool: false,
};
