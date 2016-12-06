# Ext JS Reactor Webpack TypeScript Plugin

This [Webpack](http://webpack.github.io/) plugin produces a minimized build of the [Sencha Ext JS](https://www.sencha.com/products/extjs) framework containing only those classes used by your React app.
Use with the `extjs-reactor`.

## How it works

The plugin crawls your React source code looking for JSX tags that match Ext JS xtypes as well as calls to `Ext.create()` and `Ext.require()` to compile a list of classes used by your app.
It then uses [Sencha Cmd](https://www.sencha.com/products/extjs/cmd-download/) to produce an optimized build of Ext JS containing only those classes and corresponding CSS.
You include the built js and css
files into your index.html.

## Dependencies

You must have Ext JS 6.2+ and Sencha Cmd 6.2+ to use this plugin.

## Options

The ExtJSReactorWebpackTSPlugin constructor takes an object with the following properties:

* sdk [string] The path to the Ext JS SDK
* toolkit (optional) [string] "modern" or "classic".  Defaults to "modern".
* theme (optional) [string] The name of the theme package to use. Defaults to "theme-triton".
* packages (optional) [string[]] Packages to include.  Values correspond to the names of directories in the packages directory of your SDK.
* output (optional) [string] The path within the output directory in which the Ext JS build should be created.  Defaults to "extjs"
* test (optional) [RegExp] All files matching this pattern will be searched for usage of Ext classes to include in the build.  Defaults to `/\.tsx?$/`
* debug (optional) [boolean] True to output debug information.  Defaults to false.

## Example

```ts
// webpack.config.js
'use strict';

const path = require('path');
const webpack = require('webpack');
const ExtJSReactorWebpackTSPlugin = require('@extjs/reactor-webpack-ts-plugin');

module.exports = {
  devtool: 'inline-source-map',

  entry: [
    './src/index'
  ],

  output: {
    path: path.join(__dirname, 'build'),
    filename: 'index.js'
  },

  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
    alias: {
      "react-dom": path.resolve('./node_modules/react-dom')
    }
  },

  plugins: [
    new CopyWebpackPlugin([{ from: 'static' }]),
    new ExtJSReactorWebpackTSPlugin({
      sdk: 'ext', // you need to copy the Ext JS SDK to the root of this package, or you can specify a full path to some other location
      theme: 'theme-material',
      packages: ['charts']
    })
  ],

  module: {
    preLoaders: [
      {
        test: /\.js$/,
        loader: 'source-map-loader'
      }
    ],
    loaders: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        include: [
          path.join(__dirname, 'src')
        ]
      },
      {
        test: /\.css$/,
        loader: 'style!css'
      },
      {
        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
        exclude: /\/favicon.ico$/,
        loader: 'file',
        query: {
          name: 'static/media/[name].[hash:8].[ext]'
        }
      }
    ]
  }
};
```

For working example, please checkout <https://github.com/unional/reactor-typescript-boilerplate.git>
