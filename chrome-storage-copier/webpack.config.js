const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    background: './background.js',
    content: './content.js',
    devtools: './devtools.js',
    panel: './panel.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    minimize: true
  }
};
