/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: http://www.gatsbyjs.org/docs/node-apis/
 */

const swc = require('esbuild')
const { ESBuildMinifyPlugin } = require('esbuild-loader')
const { perfMetrics } = require('./loader')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

const excludeRule = /\/src\//
const includeRule = /\/src\/.*\.(js|jsx|tsx)$/
const isDev = process.env.NODE_ENV === 'development'

/**
 * Defines the options schema
 *
 */
module.exports.pluginOptionsSchema = ({ Joi }) => {
  return Joi.object({
    swcOptions: Joi.string().optional(),
    ignoreFiles: Joi.string().optional(),
  })
}

function isJsLoader(rule) {
  return (
    rule.test &&
    (new RegExp(rule.test).test('file.js') ||
      new RegExp(rule.test).test('file.ts') ||
      new RegExp(rule.test).test('file.tsx'))
  )
}

function useSwcLoader(options = {}) {
  return {
    loader: require.resolve('./loader.js'),
    options,
  }
}

/**
 * TODO: Gatsby babel-loader packages/gatsby/src/utils/babel-loader.js
 * has very good caching capabilities. We not use them yet.
 */
function replaceBabelLoader(rule, options) {
  // To bypass the new loader, simply return:
  // return rule

  const exclude = rule.exclude

  if (typeof rule?.use === 'function') {
    const originalUseRule = rule.use

    rule.use = (context) => {
      if (
        originalUseRule &&
        options.ignoreFiles &&
        new RegExp(options.ignoreFiles).test(context.resource)
      ) {
        return originalUseRule(context)
      }

      return useSwcLoader(options?.swcOptions)
    }
    if (isDev) {
      rule.exclude = (file) => {
        if (file) {
          if (excludeRule.test(file)) {
            return true
          }
          if (typeof exclude === 'function') {
            return exclude(file)
          } else if (exclude) {
            return exclude.test(file)
          }
        }
        return false
      }
    }
  } else if (rule.use || rule.loader) {
    Object.assign(rule, useSwcLoader(options?.swcOptions))
    delete rule.use
  }

  return rule
}

/**
 * Update Webpack Config
 *
 */
module.exports.onCreateWebpackConfig = (
  { actions, getConfig, stage, store, loaders },
  pluginOptions
) => {
  const webpackConfig = getConfig()
  const { config } = store.getState()
  const isDev = stage === 'develop' || stage === 'develop-html'
  const options = pluginOptions?.swcOptions
  pluginOptions.swcOptions = {
    minify: false,
    // env: { mode: 'usage' },
    ...options,
    jsc: {
      parser: {
        syntax: 'typescript', // "ecmascript" | "typescript"
        jsx: true,
        tsx: true,
        dynamicImport: true,
        ...options?.jsc?.parser,
      },
      target: options?.target ?? (isDev ? 'es2017' : undefined),
      transform: {
        react: {
          runtime: config.jsxRuntime,
          importSource: config.jsxImportSource,
          development: isDev,
          ...options?.jsc?.transform?.react,
        },
        ...options?.jsc?.transform,
      },
      ...options?.jsc,
    },
  }

  if (!global.__originalLoader) {
    global.__originalLoader = loaders.js
  }

  if (loaders.js !== globalThis.makeUseswcLoader) {
    loaders.js = globalThis.makeUseswcLoader = function makeUseswcLoader() {
      return useSwcLoader(pluginOptions?.swcOptions)
    }
  }

  // Only for the fast refresh we still use the original loader
  if (isDev) {
    webpackConfig.module.rules.push({
      ...global.__originalLoader(),
      test: includeRule,
    })
  }

  webpackConfig.module.rules = webpackConfig.module.rules.map((rule) => {
    if (Array.isArray(rule?.oneOf)) {
      rule.oneOf = rule.oneOf.map((sub) => {
        if (isJsLoader(sub)) {
          sub = replaceBabelLoader(sub, pluginOptions)
        }

        return sub
      })
    } else if (Array.isArray(rule?.use)) {
      if (isJsLoader(rule)) {
        rule.use = rule.use.map((sub) => {
          return replaceBabelLoader(sub, pluginOptions)
        })
      }
    } else if (isJsLoader(rule)) {
      rule = replaceBabelLoader(rule, pluginOptions)
    }

    return rule
  })

  if (Array.isArray(webpackConfig?.optimization?.minimizer)) {
    webpackConfig.optimization.minimizer =
      webpackConfig.optimization.minimizer.map((plugin) => {
        if (plugin.constructor.name === 'TerserPlugin') {
          plugin = new ESBuildMinifyPlugin({
            implementation: swc,
          })
        }

        if (plugin.constructor.name === 'CssMinimizerPlugin') {
          plugin = new CssMinimizerPlugin({
            minify: CssMinimizerPlugin.parcelCssMinify,
            // minimizerOptions: { targets: { ie: 11 }, drafts: { nesting: true } },
          })
        }

        return plugin
      })
  }

  actions.replaceWebpackConfig(webpackConfig)
}

module.exports.onPostBuild = ({ reporter }) => {
  reporter.info(
    `gatsby-plugin-swc: ${Number(perfMetrics.swc / 100).toFixed(
      3
    )}s with Babel ${Number(perfMetrics.babel / 100).toFixed(3)}s`
  )
}
