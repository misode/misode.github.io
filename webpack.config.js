const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MergeJsonWebpackPlugin = require("merge-jsons-webpack-plugin");
const webpack = require('webpack');
const config = require('./src/config.json')

module.exports = (env, argv) => ({
  entry: './src/app/Router.ts',
  output: {
    path: __dirname + '/dist',
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
    new webpack.DefinePlugin({
      __MCDATA_MASTER_HASH__: JSON.stringify(env ? env.hash : '')
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/styles', to: 'styles' },
        { from: 'src/sitemap.txt', to: 'sitemap.txt' },
        { from: 'src/favicon-32.png', to: 'favicon-32.png' }
      ]
    }),
    new MergeJsonWebpackPlugin({
      output: {
        groupBy: config.languages.map(lang => ({
          pattern: `{./src/locales/${lang.code}.json,./node_modules/@mcschema/locales/src/${lang.code}.json}`,
          fileName: `./locales/${lang.code}.json`
        }))
      }
    }),
    new HtmlWebpackPlugin({
      title: 'Data Pack Generators Minecraft 1.16, 1.17',
      filename: 'index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      title: 'Data Pack Generators Minecraft 1.16, 1.17',
      filename: '404.html',
      template: 'src/index.html'
    }),
    ...config.models.map(m => new HtmlWebpackPlugin({
      title: `${m.name} Generator${m.category === true ? 's' : ''} Minecraft 1.16, 1.17`,
      filename: `${m.id}/index.html`,
      template: 'src/index.html'
    }))
  ]
})
