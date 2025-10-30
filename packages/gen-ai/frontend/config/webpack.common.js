// Patch crypto.createHash for FIPS compliance BEFORE any webpack plugins are loaded
// This must be done before any webpack plugins are instantiated
const crypto = require('crypto');
// Only patch if not already patched (idempotent)
if (!crypto.createHash._isPatched) {
  // Store the TRUE original before patching
  const trueOriginal = crypto.createHash;
  crypto.createHash = function(algorithm, options) {
    // Replace md4 with sha256 for FIPS compliance (md4 is not FIPS-compliant)
    // Also handle undefined/null algorithms
    const fipsAlgorithm = (!algorithm || algorithm === 'md4') ? 'sha256' : algorithm;
    // On FIPS clusters, always call without options parameter
    // Call with crypto as context to ensure proper binding
    try {
      // Always try without options first (safer for FIPS)
      return trueOriginal.call(crypto, fipsAlgorithm);
    } catch (error) {
      // If sha256 fails, this is a serious FIPS issue - log and rethrow
      // This should not happen as sha256 is FIPS-compliant
      if (error.code === 'ERR_OSSL_EVP_UNSUPPORTED' || 
          (error.message && error.message.includes('digital envelope'))) {
        // Try with explicit algorithm string
        try {
          return trueOriginal.call(crypto, 'sha256');
        } catch (e2) {
          // Last resort: try with original algorithm if it's not md4
          if (algorithm && algorithm !== 'md4') {
            return trueOriginal.call(crypto, algorithm);
          }
          throw e2;
        }
      }
      throw error;
    }
  };
  // Mark as patched and store TRUE original reference
  crypto.createHash._isPatched = true;
  crypto.createHash._originalCreateHash = trueOriginal;
}

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const { moduleFederationPlugins } = require('./moduleFederation');
const { setupWebpackDotenvFilesForEnv } = require('./dotenv');
const { name } = require('../package.json');

const BG_IMAGES_DIRNAME = 'bgimages';
const SRC_DIR = process.env._SRC_DIR;
const DIST_DIR = process.env._DIST_DIR;
const COMMON_DIR = process.env._COMMON_DIR;
const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR;

module.exports = (env) => ({
  entry: {
    app: path.join(SRC_DIR, 'index.ts'),
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx)?$/,
        exclude: [/node_modules\/(?!@odh-dashboard)/, /__tests__/, /__mocks__/],
        use: [
          env === 'development'
            ? { loader: 'swc-loader' }
            : {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                  experimentalWatchApi: true,
                },
              },
        ],
      },
      {
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        type: 'asset/resource',
        // only process modules with this loader
        // if they live under a 'fonts' or 'pficon' directory
        include: [
          path.resolve(RELATIVE_DIRNAME, 'node_modules/patternfly/dist/fonts'),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/dist/styles/assets/fonts',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/dist/styles/assets/pficon',
          ),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly/assets/fonts'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly/assets/pficon'),
        ],
      },
      {
        test: /\.svg$/,
        type: 'asset/inline',
        include: (input) => input.indexOf('background-filter.svg') > 1,
        use: [
          {
            options: {
              limit: 5000,
              outputPath: 'svgs',
              name: '[name].[ext]',
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        // only process SVG modules with this loader if they live under a 'bgimages' directory
        // this is primarily useful when applying a CSS background using an SVG
        include: (input) => input.indexOf(BG_IMAGES_DIRNAME) > -1,
        type: 'asset/inline',
      },
      {
        test: /\.svg$/,
        // only process SVG modules with this loader when they don't live under a 'bgimages',
        // 'fonts', or 'pficon' directory, those are handled with other loaders
        include: (input) =>
          input.indexOf(BG_IMAGES_DIRNAME) === -1 &&
          input.indexOf('fonts') === -1 &&
          input.indexOf('background-filter') === -1 &&
          input.indexOf('pficon') === -1,
        use: {
          loader: 'raw-loader',
          options: {},
        },
      },
      {
        test: /\.(jpg|jpeg|png|gif)$/i,
        include: [
          SRC_DIR,
          COMMON_DIR,
          path.resolve(RELATIVE_DIRNAME, 'src'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/patternfly'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/patternfly/assets/images'),
          path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly/react-styles/css/assets/images'),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/dist/styles/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-core/node_modules/@patternfly/react-styles/css/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-table/node_modules/@patternfly/react-styles/css/assets/images',
          ),
          path.resolve(
            RELATIVE_DIRNAME,
            'node_modules/@patternfly/react-inline-edit-extension/node_modules/@patternfly/react-styles/css/assets/images',
          ),
        ],
        type: 'asset/inline',
        use: [
          {
            options: {
              limit: 5000,
              outputPath: 'images',
              name: '[name].[ext]',
            },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
    ],
  },
  output: {
    filename: '[name].bundle.js',
    path: DIST_DIR,
    publicPath: 'auto',
    uniqueName: name,
    hashFunction: 'sha256', // Use FIPS-compliant hash function
  },
  plugins: [
    ...moduleFederationPlugins,
    ...setupWebpackDotenvFilesForEnv({
      directory: RELATIVE_DIRNAME,
      isRoot: IS_PROJECT_ROOT_DIR,
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(SRC_DIR, 'index.html'),
      chunks: ['app'],
    }),
    new Dotenv({
      systemvars: true,
      silent: true,
    }),
    new CopyPlugin({
      patterns: [{ from: './src/favicon.png', to: 'images' }],
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
    alias: {
      '~': path.resolve(SRC_DIR),
    },
    symlinks: false,
    cacheWithContext: false,
  },
});
