/// <reference path="../typings/node/node.d.ts"/>

var nconf  = require('nconf');
var path   = require('path');
var log4js = require('log4js');
var _      = require('lodash');
var fse    = require('fs-extra');

var pathIsAbsolute = require('path-is-absolute');

nconf.argv()
  .env()
  .file({
    file: path.join(__dirname, 'config.json')
  });

var root = path.dirname(__dirname);

// now logging is configured and can be used throughout the application
var cfg = (function() {
  var data = nconf.get('data');

  if (!pathIsAbsolute(data.output))  // if (!path.isAbsolute(data.temp))
    data.output = path.join(root, data.output);

  if (!pathIsAbsolute(data.temp))  // if (!path.isAbsolute(data.temp))
    data.temp = path.join(data.output, data.temp);

  fse.mkdirsSync(data.output);
  data.media = path.join(root, data.media);

  return {
    books: function() {
      return path.normalize(data.bibles);
    },

    bibleDir: function(name) {
      return {
        name: name,
        ext:  'usfm',
        from: path.join(data.input, name),
        to:   path.join(data.output, name)
      };
    },

    outputDir: function() {
      return data.output;
    },

    inputDir: function() {
      return data.input;
    },

    tmpDir: function() {
      return data.temp;
    },

    mediaDir: function() {
      return data.media;
    },

    test_usfm: function() {
      return {dir: '', files: ''};
    }
  };
})();


// make sure that logging directory do exists
function createLogDirectory(loggerConfig) {
  if (_.isUndefined(loggerConfig))
    throw new Error('Application is not configured properly! Check file `config/config.json`.');

  loggerConfig.appenders.forEach(function(entry) {
    if (!_.isUndefined(entry.filename)) {
      entry.filename = entry.filename.replace('${data.output}', cfg.outputDir());
      var ld = path.dirname(entry.filename);
      fse.mkdirsSync(ld);
    }
  });
}

var loggerConfig = nconf.get('log4js');
createLogDirectory(loggerConfig);

// if started from mocha we can disable logging
var cmd = nconf.argv().get('$0');
if (path.basename(cmd) === '_mocha') {
  // disable logging for all loggers
  loggerConfig.levels = {'[all]': 'ERROR'};
}

// configure logging and process with our modules
log4js.configure(loggerConfig, {});
log4js.getLogger().info('root dir: ' + root);

function logFileLoading(filename) {
  var relative = path.relative(root, filename);
  log4js.getLogger().info('loaded: ' + relative);
}

module.exports.nconf          = nconf;
module.exports.cfg            = cfg;
module.exports.logFileLoading = logFileLoading;

logFileLoading(__filename);
