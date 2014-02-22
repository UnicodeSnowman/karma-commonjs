var path = require('path');
var os = require('os');

var BRIDGE_FILE_PATH = path.normalize(__dirname + '/../client/commonjs_bridge.js');

var initCommonJS = function(/* config.files */ files) {

  // Include the file that resolves all the dependencies on the client.
  files.push({
    pattern: BRIDGE_FILE_PATH,
    included: true,
    served: true,
    watched: false
  });
};

var appendModuleString = function (key, content) {
      return 'window.__cjs_module__["' + key + '"] = function(require, module, exports) {' +
      content + os.EOL +
      '};';
};

var appendBrowserifyModuleString = function (key, content) {
      return 'window.__cjs_module_browserify__["' + key + '"] = function(require, module, exports) {' +
      content + os.EOL +
      '};';
};

var createPreprocesor = function(logger, config, basePath) {
  var log = logger.create('preprocessor.commonjs');
  var modulesRootPath = path.resolve(config && config.modulesRoot ? config.modulesRoot : path.join(basePath, 'node_modules'));
  var browserifyModuleAliases = {};

  if (config && config.browserifyAliases) {
      config.browserifyAliases.forEach(function (alias) {
        var resolvedPath = path.resolve(alias.path);
        browserifyModuleAliases[resolvedPath] = alias.alias
      });
  }


  //normalize root path on Windows
  if (process.platform === 'win32') {
    modulesRootPath = modulesRootPath.replace(/\\/g, '/');
  }

  log.debug('Configured root path for modules "%s".', modulesRootPath);

  return function(content, file, done) {
    if (file.originalPath === BRIDGE_FILE_PATH) {
      return done(content);
    }

    log.debug('Processing "%s".', file.originalPath);

    var output =
      'window.__cjs_modules_root__ = "' + modulesRootPath + '";' +
      'window.__cjs_module__ = window.__cjs_module__ || {};' +
      'window.__cjs_module_browserify__ = window.__cjs_module_browserify__ || {};';

    var browserifyAlias = browserifyModuleAliases[file];
    if (browserifyAlias) {
      output += appendBrowserifyModuleString(browserifyAlias, content);
    } else {
      output += appendModuleString(file.originalPath, content);
    }

    done(output);
  };
};
createPreprocesor.$inject = ['logger', 'config.commonjsPreprocessor', 'config.basePath'];

// PUBLISH DI MODULE
module.exports = {
  'framework:commonjs': ['factory', initCommonJS],
  'preprocessor:commonjs': ['factory', createPreprocesor]
};
