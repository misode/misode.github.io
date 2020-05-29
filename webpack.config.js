const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: './src/app/app.ts',
  output: {
    path: __dirname + '/public',
    filename: 'build/bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/locales', to: 'build/locales'}
      ]
    })
  ]
}
