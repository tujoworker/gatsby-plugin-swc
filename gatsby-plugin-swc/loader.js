const babel = require('@babel/core')
const swc = require('@swc/core')
const { performance } = require('perf_hooks')

const perfMetrics = {
  babel: 0,
  swc: 0,
}

const babelConfig = {
  plugins: [
    require.resolve('@babel/plugin-syntax-jsx'),
    require.resolve('@babel/plugin-transform-runtime'),
    require.resolve('babel-plugin-remove-graphql-queries'),
  ],
  sourceMaps: false,
  babelrc: false,
  babelrcRoots: false,
  configFile: false,
}

async function transform(code, options) {
  if (code.includes('graphql')) {
    babelConfig.filename = options.filename

    const babelStart = performance.now()

    const result = await babel.transform(code, babelConfig)
    code = result.code

    const babelEnd = performance.now()
    perfMetrics.babel += babelEnd - babelStart
  }

  const swcStart = performance.now()

  const result = await swc.transform(code, options)

  const swcEnd = performance.now()
  perfMetrics.swc += swcEnd - swcStart

  return result
}

module.exports = async function (source, inputSourceMap) {
  const callback = this.async()
  const filename = this.resourcePath

  let loaderOptions = this.getOptions() || {}

  if (inputSourceMap) {
    inputSourceMap = JSON.stringify(inputSourceMap)
  }

  const transformOptions = Object.assign({}, loaderOptions, {
    filename,
    inputSourceMap: inputSourceMap || undefined,

    sourceMaps:
      loaderOptions.sourceMaps === undefined
        ? this.sourceMap
        : loaderOptions.sourceMaps,

    sourceFileName: filename,
  })

  delete transformOptions.stage
  delete transformOptions.reactRuntime
  delete transformOptions.reactImportSource
  delete transformOptions.cacheDirectory
  delete transformOptions.rootDir

  // auto detect development mode
  if (
    this.mode &&
    transformOptions?.jsc?.transform?.react &&
    !Object.prototype.hasOwnProperty.call(
      transformOptions.jsc.transform.react,
      'development'
    )
  ) {
    transformOptions.jsc.transform.react.development =
      this.mode === 'development'
  }

  try {
    const { code, map } = await transform(source, transformOptions)
    callback(null, code, map && JSON.parse(map))
  } catch (error) {
    callback(error)
  }
}

module.exports.perfMetrics = perfMetrics
