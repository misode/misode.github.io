const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env, argv) => ({
  entry: './src/app/app.ts',
  output: {
    path: __dirname + '/public',
    publicPath: argv.mode === 'production' ? '/dev/' : '/',
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
        {
          from: 'src/locales',
          to: 'build/locales'
        },
        {
          from: 'node_modules/minecraft-schemas/src/locales',
          to: 'build/locales-schema'
        }
      ]
    })
  ]
})
