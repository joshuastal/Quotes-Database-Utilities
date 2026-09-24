const path = require('node:path');
const webpack = require('webpack');
const dotenv = require('dotenv');

const env = dotenv.config({
  path: path.resolve(__dirname, 'src/.env'),
  quiet: true,
}).parsed ?? process.env;

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  plugins: [
    new webpack.DefinePlugin({
      'process.env.GOOGLE_OAUTH_CLIENT_ID': JSON.stringify(
        env.GOOGLE_OAUTH_CLIENT_ID ?? ''
      ),
      'process.env.GOOGLE_OAUTH_CLIENT_SECRET': JSON.stringify(
        env.GOOGLE_OAUTH_CLIENT_SECRET ?? ''
      ),
    }),
  ],
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
};
