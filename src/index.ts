import * as fs from 'fs';
import * as path from 'path';
import { sync as mkdirp } from 'mkdirp';
import { sync as rimraf } from 'rimraf';
import { execSync, spawn } from 'child_process';
import extend = require('xtend');
import * as ts from 'typescript';
import astring = require('astring');

import extractFromTSX from './extractFromTSX';
import { buildXML, createAppJson, createWorkspaceJson } from './artifacts';

let watching = false;

let defaultOptions = {
  builds: {},
  debug: false,
  watch: false,
  test: /\.tsx?$/,
  /* begin single build only */
  output: 'extjs',
  sdk: '',
  toolkit: 'modern',
  theme: 'theme-triton',
  packages: []
  /* end single build only */
}

/**
 * Produces a minimal build of the Ext JS framework by crawling your React source code and extracting the xtypes used
 * in JSX tags
 */
export default class ReactExtJSWebpackTSPlugin {
  options: any
  dependencies = {}
  currentFile: string

  /**
   * @param {Object[]} builds
   * @param {Boolean} [debug=false] Set to true to prevent cleanup of build temporary build artifacts that might be helpful in troubleshooting issues.
   * @param {String} sdk The full path to the Ext JS SDK
   * @param {String} [toolkit='modern'] "modern" or "classic"
   * @param {String} theme The name of the Ext JS theme package to use, for example "theme-material"
   * @param {String[]} packages An array of Ext JS packages to include
   * @param {String} output The path to directory where the Ext JS bundle should be written
   */
  constructor(options = {}) {
    this.options = extend(options, defaultOptions, options);

    if (Object.keys(this.options.builds).length === 0) {
      const { sdk, toolkit, theme, packages, output } = this.options;
      this.options.builds.ext = { sdk, toolkit, theme, packages, output };
    }

    for (let name in this.options.builds) {
      this._validateBuildConfig(name, this.options.builds[name]);
    }
  }

  apply(compiler) {
    compiler.plugin('watch-run', (watching, cb) => {
      this.options.watch = true;
      cb();
    });

    // extract xtypes from JSX tags
    compiler.plugin('compilation', (compilation, params) => {
      compilation.plugin('build-module', (module) => {
        this.currentFile = module.resource;

        if (module.resource && module.resource.match(this.options.test)) {
          try {
            if (this.options.debug) {
              console.log(module.resource);
            }
            const contents = fs.readFileSync(module.resource, 'utf8');

            // TODO: Make scriptTarget part of option.
            const statements = extractFromTSX(contents, ts.ScriptTarget.ES2016);
            // console.log(this.currentFile, statements)
            this.dependencies[this.currentFile] = statements;
          }
          catch (e) {
            console.error('error parsing ' + this.currentFile);
          }
        }
      });
    });

    const me = this;

    /**
     * Adds the code for the specified function call to the manifest.js file
     * @param {Object} call A function call AST node.
     */
    const addToManifest = function (call) {
      let file;
      try {
        file = this.state.module.resource;
        let deps = me.dependencies[file];
        if (!deps) {
          deps = me.dependencies[file] = [];
        }
        deps.push(astring(call));
      }
      catch (e) {
        console.error(`Error processing ${file}, ${e}`);
      }
    };

    // extract xtypes and classes from Ext.create calls
    compiler.parser.plugin('call Ext.create', addToManifest);

    // copy Ext.require calls to the manifest.  This allows the users to explicitly require a class if the plugin fails to detect it.
    compiler.parser.plugin('call Ext.require', addToManifest);

    // copy Ext.define calls to the manifest.  This allows users to write standard Ext JS classes.
    compiler.parser.plugin('call Ext.define', addToManifest);

    // once all modules are processed, create the optimized Ext JS build.
    compiler.plugin('emit', (compilation, callback) => {
      const modules = compilation.chunks.reduce((a, b) => a.concat(b.modules), []);
      const build = this.options.builds[Object.keys(this.options.builds)[0]];
      let outputPath = path.join(compiler.outputPath, this.options.output);

      // webpack-dev-server overwrites the outputPath to "/", so we need to prepend contentBase
      if (compiler.outputPath === '/' && compiler.options.devServer) {
        outputPath = path.join(compiler.options.devServer.contentBase, outputPath);
      }

      this._buildExtBundle('ext', modules, outputPath, build)
        .then(() => {
          // the following is needed for html-webpack-plugin to include <script> and <link> tags for Ext JS
          const jsChunk = compilation.addChunk(`${this.options.output}-js`);
          jsChunk.isInitial = () => true;
          jsChunk.files.push(path.join(this.options.output, 'ext.js'));
          jsChunk.files.push(path.join(this.options.output, 'ext.css'));
          jsChunk.id = -1; // this forces html-webpack-plugin to include ext.js first

          callback();
        })
        .catch(e => callback(e || new Error('Error building Ext JS bundle')));
    });
  }

  /**
   * Checks each build config for missing/invalid properties
   * @param {String} name The name of the build
   * @param {String} build The build config
   * @private
   */
  _validateBuildConfig(name, build) {
    const { sdk } = build;
    if (!sdk) {
      throw new Error(`Missing required option sdk in build ${name}.  This must be the path to your Ext JS SDK.`);
    }
  }

  /**
   * Builds a minimal version of the Ext JS framework based on the classes used
   * @param {String} name The name of the build
   * @param {Module[]} modules webpack modules
   * @param {String} output The path to where the framework build should be written
   * @param {String} [toolkit='modern'] "modern" or "classic"
   * @param {String} output The path to the directory to create which will contain the js and css bundles
   * @param {String} theme The name of the Ext JS theme package to use, for example "theme-material"
   * @param {String[]} packages An array of Ext JS packages to include
   * @param {String} sdk The full path to the Ext JS SDK
   * @private
   */
  _buildExtBundle(name, modules, output, { toolkit = 'modern', theme, packages = [], sdk }) {
    return new Promise((resolve, reject) => {
      console.log(`\nbuilding Ext JS bundle: ${name} => ${output}`);

      if (!watching) {
        rimraf(output);
        mkdirp(output);
      }

      let statements = ['Ext.require("Ext.Component")']; // for some reason command doesn't load component when only panel is required

      for (let module of modules) {
        const deps = this.dependencies[module.resource];
        if (deps) {
          statements = statements.concat(deps);
        }
      }

      const js = statements.join(';\n');
      const manifest = path.join(output, 'manifest.js');

      fs.writeFileSync(manifest, js, 'utf8');

      if (!watching) {
        fs.writeFileSync(path.join(output, 'build.xml'), buildXML, 'utf8');
        fs.writeFileSync(path.join(output, 'app.json'), createAppJson({ theme, packages, toolkit }), 'utf8');
        fs.writeFileSync(path.join(output, 'workspace.json'), createWorkspaceJson(sdk, output), 'utf8');
      }

      if (this.options.watch) {
        if (!watching) {
          const watching = spawn('sencha', ['ant', 'watch'], { cwd: output });
          watching.stdout.pipe(process.stdout);
          watching.stdout.on('data', data => {
            if (data.toString().match(/Waiting for changes\.\.\./)) {
              resolve(output);
            }
          });
          watching.on('exit', code => reject())
        }
      }
      else {
        execSync('sencha ant build', { cwd: output, stdio: 'inherit' });
        resolve(output);
      }
    });
  }
};
