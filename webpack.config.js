const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = (env, argv) => ({
  entry: './src/app/app.ts',
  output: {
    path: __dirname + '/dist',
    publicPath: argv.mode === 'production' ? '/alpha/' : '/',
    filename: 'js/bundle.js'
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
          to: 'locales/app'
        },
        {
          from: 'node_modules/minecraft-schemas/src/locales',
          to: 'locales/schema'
        },
        {
          from: 'src/styles',
          to: 'styles'
        }
      ]
    }),
    new HtmlWebpackPlugin({
      title: 'Minecraft Generators',
      filename: 'index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      title: 'Loot Table Generator Minecraft',
      filename: 'loot-table/index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      title: 'Predicate Generator Minecraft',
      filename: 'predicate/index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      title: 'Advancement Generator Minecraft',
      filename: 'advancement/index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      title: 'Dimension Generator Minecraft',
      filename: 'dimension/index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      title: 'Dimension Type Generator Minecraft',
      filename: 'dimension-type/index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      title: 'Sandbox Generator Minecraft',
      filename: 'sandbox/index.html',
      template: 'src/index.html'
    })
  ]
})
