// Patch crypto.createHash for FIPS compliance BEFORE any webpack plugins are loaded
// Note: webpack.common.js also patches this, but we patch here first to ensure
// it's done before any plugins in this file are loaded
const crypto = require('crypto');
// Only patch if not already patched (idempotent)
if (!crypto.createHash._isPatched) {
  // Store the TRUE original before patching
  const trueOriginal = crypto.createHash;
  crypto.createHash = function(algorithm, options) {
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
  crypto.createHash._isPatched = true;
  crypto.createHash._originalCreateHash = trueOriginal;
}

const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');

const { setupWebpackDotenvFilesForEnv, setupDotenvFilesForEnv } = require('./dotenv');

setupDotenvFilesForEnv({ env: 'production' }); // Moved here
const common = require('./webpack.common.js'); // Required after env setup

const RELATIVE_DIRNAME = process.env._RELATIVE_DIRNAME;
const IS_PROJECT_ROOT_DIR = process.env._IS_PROJECT_ROOT_DIR;
const DIST_DIR = process.env._DIST_DIR;
const OUTPUT_ONLY = process.env._OUTPUT_ONLY;

if (OUTPUT_ONLY !== 'true') {
  console.info(`Cleaning OUTPUT DIR...\n  ${DIST_DIR}\n`);
}

module.exports = merge(
  {
    plugins: [
      ...setupWebpackDotenvFilesForEnv({
        directory: RELATIVE_DIRNAME,
        env: 'production',
        isRoot: IS_PROJECT_ROOT_DIR,
      }),
    ],
  },
  common('production'),
  {
    mode: 'production',
    devtool: 'source-map',
    optimization: {
      minimizer: [
        new TerserJSPlugin({}),
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: ['default', { mergeLonghand: false }],
          },
        }),
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[name].bundle.css',
      }),
    ],
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
  },
);
