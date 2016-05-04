var fs = require('fs');
var path = require('path');
var nodeModules = {};

module.exports = {
  entry: ['babel-polyfill', './lambda/index.js'],
  target: 'node',
  output: {
    path: path.join(__dirname, 'lambda'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs',
  },
  externals: [
    //because it's already available in the lambda environment
    'aws-sdk',
    //because utils/conf.js and utils/conf.json are included in zip
    'utils/conf',
  ],
  module: {
    //suppress "define cannot be used indirect" error
    noParse: /node_modules\/json-schema\/lib\/validate/,
    loaders: [
      {
        test: /\.json$/,
        loader: 'json'
      },
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: [
          /node_modules/,
          /aws/
        ],
        //presets and plugins are in .babelrc
      },
    ],
  },
};
