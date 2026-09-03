const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// const appNodeModules = path.resolve(__dirname, '../../node_modules');
const defaultResolveRequest = config.resolver.resolveRequest;

// config.resolver.resolveRequest = (context, moduleName, platform) => {
//   if (
//     moduleName === 'react' ||
//     moduleName === 'react/jsx-runtime' ||
//     moduleName === 'react/jsx-dev-runtime' ||
//     moduleName === 'react-dom'
//   ) {
//     const subpath = moduleName.replace('react-dom', '').replace('react', '');
//     const pkg = moduleName.startsWith('react-dom') ? 'react-dom' : 'react';
//     const filePath = path.join(
//       appNodeModules,
//       pkg,
//       subpath ? subpath + '.js' : 'index.js'
//     );
//     return { type: 'sourceFile', filePath };
//   }
//   if (defaultResolveRequest) {
//     return defaultResolveRequest(context, moduleName, platform);
//   }
//   return context.resolveRequest(context, moduleName, platform);
// };

config.resolver.resolveRequest = (context, moduleName, platform) => {
  let pkg = null;
  let subpath = '';

  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    pkg = 'react';
    subpath = moduleName.slice('react'.length);
  } else if (moduleName === 'react-dom' || moduleName.startsWith('react-dom/')) {
    pkg = 'react-dom';
    subpath = moduleName.slice('react-dom'.length);
  }

  if (pkg) {
    const filePath = require.resolve(pkg + subpath, { paths: [__dirname] });
    return { type: 'sourceFile', filePath };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};




module.exports = config;
