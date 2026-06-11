// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

// react-native-maps is native-only; swap it for a stub when bundling for web
// so the web build doesn't pull in native-only modules.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/shims/MapShim.tsx'),
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
