const path = require('node:path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const rules = require('./webpack.rules');

const env = dotenv.config({
  path: path.resolve(__dirname, 'src/.env'),
  quiet: true,
}).parsed ?? process.env;

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY ?? ''),
    }),
  ],
  // Put your normal webpack config below here
  module: {
    rules,
  },
};
