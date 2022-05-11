# Gatsby Plugin for using ES-Build

This Gatsby Plugin replaces the Webpack `babel-loader` with `@swc/core`.

Ideally – Babel and Webpack would rather use some low lever languages to make their AST parser faster. But that will not happen.

Because, there are almost too many thread offs:

- Babel is not supported anymore.
- It can make the build process faster, but it may not, because we have still Webpack and Babel in the pipe, to do some work.

💥 **So, do not use it in production.** 💥

It is experimental and not really mean to be used in production.

## How it works

It simply uses `@swc/core` and removes all GraphQL Queries.
It uses `esbuild` for JavaScript minification.
It uses `@parcel/css` for CSS minification.

## How to install and use

```bash
yarn add -D gatsby-plugin-swc
```

```js
// gatsby-config
module.exports = {
  plugins: ['gatsby-plugin-swc'],
}
```
