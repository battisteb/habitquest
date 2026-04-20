const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ─── Web: resolve native-only modules to empty stubs ─────────────────────────
// Metro statically bundles ALL require() calls, even those inside isNative guards.
// Returning { type: 'empty' } prevents the native SDK code from being included
// in the web bundle, which would crash on internal React Native imports.
const NATIVE_ONLY_MODULES = new Set([
  'react-native-google-mobile-ads',
  'react-native-purchases',
]);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && NATIVE_ONLY_MODULES.has(moduleName)) {
    return { type: 'empty' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
