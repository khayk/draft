/// <reference path="../typings/node/node.d.ts"/>

var nconf  = require('nconf');
var path   = require('path');
var mkdirp = require('mkdirp');
var log4js = require('log4js');
var _      = require('lodash');

var pathIsAbsolute = require('path-is-absolute');

nconf.argv()
  .env()
  .file({
    file: path.join(__dirname, 'config.json')
  });

var root = path.dirname(__dirname);

// make sure that logging directory do exists
function createLogDirectory(loggerConfig) {
  if (_.isUndefined(loggerConfig)) {
    throw 'Application is not configured properly! Check file `config/config.json`.';
  }

  loggerConfig.appenders.forEach(function(entry) {
    if (!_.isUndefined(entry.filename)) {
      var ld = path.dirname(entry.filename);
      mkdirp.sync(ld);
    }
  });
}


var loggerConfig = nconf.get('log4js');
createLogDirectory(loggerConfig);


// if started from mocha we can disable logging
var cmd = nconf.argv().get('$0');
if (path.basename(cmd) === '_mocha') {
  // disable logging for all loggers
  loggerConfig.levels = {"[all]": "ERROR"};
}

// configure logging and process with our modules
log4js.configure(loggerConfig, {});

// now logging is configured and can be used throughout of the application
var cfg = (function() {
  var data = nconf.get('data');

  if (!pathIsAbsolute(data.temp))  // if (!path.isAbsolute(data.temp))
    data.temp = path.join(root, data.temp);
  mkdirp.sync(data.temp);
  data.media = path.join(root, data.media);

  return {
    bibleDir: function(name) {
      return {
        name: name,
        ext:  'usfm',
        from: data.input  + name + '/',
        to:   data.output + name + '/'
      };
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

log4js.getLogger().info('root dir: ' + root);

function logFileLoading(filename) {
  var relative = path.relative(root, filename);
  log4js.getLogger().info('loaded: ' + relative);
}

module.exports.nconf          = nconf;
module.exports.cfg            = cfg;
module.exports.logFileLoading = logFileLoading;

logFileLoading(__filename);

