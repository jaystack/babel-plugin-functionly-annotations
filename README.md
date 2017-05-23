# babel-plugin-functionly-annotations

A babel transformer plugin for functionly decorators.

Use [babel-plugin-transform-decorators-legacy](https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy) to support decorators.

## Install

```sh
npm install --save-dev babel-plugin-functionly-annotations
```

```sh
npm install --save-dev babel-plugin-transform-decorators-legacy babel-preset-es2015-node5
```

.babelrc

```json
{
  "plugins": [
    "functionly-annotations",
    "transform-decorators-legacy"
  ],
  "presets": [
    "es2015-node5"
  ]
}
```
