// Karma configuration
// Generated on Wed Oct 05 2022 17:04:26 GMT+0200 (Central European Summer Time)

module.exports = function(config) {
  const configuration = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
    frameworks: ['mocha', 'power-assert'],

    // list of files / patterns to load in the browser
    files: [
        'node_modules/jquery/dist/jquery.js',
        'node_modules/lodash/lodash.js',
        'node_modules/@popperjs/core/dist/umd/popper.js',
        'node_modules/bootstrap/dist/js/bootstrap.js',
        'node_modules/select2/dist/js/select2.js',
        'node_modules/backbone/backbone.js',
        'node_modules/backbone-fractal/backbone-fractal.js',
        'vre/test-index.js'
    ],

    // list of files / patterns to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {
        'vre/test-index.js': ['rollup']
    },

    rollupPreprocessor: {
        external: [
            'jquery',
            'lodash',
            'underscore',
            'popper.js',
            'bootstrap',
            'select2',
            'backbone',
            'backbone-fractal',
        ],
        plugins: [
            require('@rollup/plugin-commonjs')(),
            require('rollup-plugin-node-polyfills')(),
            require('rollup-plugin-wontache')({precompile: true}),
            require('rollup-plugin-glob-import')({format: 'import'}),
            require('@rollup/plugin-json')(),
            require('@rollup/plugin-node-resolve').default({
                preferBuiltins: true,
            }),
            require('@rollup/plugin-babel').default({
                presets: ['power-assert'],
                babelHelpers: 'bundled',
            }),
        ],
        output: {
            file: 'vre/test-bundle.js',
            name: 'test',
            format: 'iife',
            globals: {
                jquery: 'jQuery',
                lodash: '_',
                underscore: '_',
                backbone: 'Backbone',
                'backbone-fractal': 'BackboneFractal',
            },
            sourcemap: 'inline',
        },
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
    reporters: ['progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
    browsers: [],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser instances should be started simultaneously
    concurrency: Infinity,

    customLaunchers: {
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--headless',
          '--remote-debugging-port=9222',
        ],
      }
    },

  };

  if (process.env.CI) {
    configuration.browsers = ['ChromeHeadless'];
    configuration.singleRun = true;
  }

  config.set(configuration);
};
