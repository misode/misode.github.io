const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MergeJsonWebpackPlugin = require("merge-jsons-webpack-plugin");

module.exports = (env, argv) => ({
  entry: './src/app/app.ts',
  output: {
    path: __dirname + '/dist',
    publicPath: argv.mode === 'production' ? '/dev/' : '/',
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
          from: 'src/styles',
          to: 'styles'
        }
      ]
    }),
    new MergeJsonWebpackPlugin({
      output: {
        groupBy: [ 'de', 'en', 'fr', 'it', 'ja', 'pt', 'ru', 'zh-cn' ].map(code => (
          {
            pattern: `{./src/locales/${code}.json,./node_modules/@mcschema/core/locales/${code}.json}`,
            fileName: `./locales/${code}.json`
          }
        ))
      }
    }),
    new HtmlWebpackPlugin({
      title: 'Data Pack Generators Minecraft',
      filename: 'index.html',
      template: 'src/index.html'
    }),
    ...[
      [ 'loot-table', 'Loot Table' ],
      [ 'predicate', 'Predicate' ],
      [ 'advancement', 'Advancement' ],
      [ 'dimension', 'Dimension' ],
      [ 'dimension-type', 'Dimension Type' ],
      [ 'worldgen/biome', 'Biome' ],
      [ 'worldgen/carver', 'Carver' ],
      [ 'worldgen/feature', 'Feature' ],
      [ 'worldgen/structure-feature', 'Structure Feature' ],
      [ 'worldgen/surface-builder', 'Surface Builder' ],
      [ 'worldgen/processor-list', 'Processor List' ],
      [ 'worldgen/template-pool', 'Template Pool' ],
    ].map(page => new HtmlWebpackPlugin({
      title: `${page[1]} Generators Minecraft`,
      filename: `${page[0]}/index.html`,
      template: 'src/index.html'
    }))
  ]
})
