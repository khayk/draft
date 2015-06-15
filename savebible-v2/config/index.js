var nconf = require('nconf');
var path  = require('path');
var mkdirp = require('mkdirp');
var log4js = require('log4js');
var _      = require('lodash');


nconf.argv()
  .env()
  .file({
    file: path.join(__dirname, 'config.json')
  });


// make sure that logging directory do exists
function createLogDirectory(logConfig) {
  logConfig.appenders.forEach(function(entry) {
    if (!_.isUndefined(entry.filename)) {
      var ld = path.dirname(entry.filename);
      mkdirp.sync(ld);
    }
  });
}

var logConfig = nconf.get('log4js');
createLogDirectory(logConfig);

// configure logging and process with our modules
log4js.configure(logConfig, {});

// now logging is configured and can be used throughout of the application

var cfg = (function() {
  var data = nconf.get('data');

  return {
    en_kjv_usfm: function() {
      var name_ = 'zed';
      return {
        name: name_,
        ext:  'usfm',
        from: data.input  + name_ + '/',
        to:   data.output + name_ + '/'
      };
    },

    test_usfm: function() {
      return {dir: '', files: ''};
    }
  };
})();

var root = path.dirname(__dirname);
//log4js.getLogger().info('root dir: ' + root);

function logFileLoading(filename) {
  var relative = path.relative(root, filename);
  log4js.getLogger().info('loaded: ' + relative);
}

module.exports.nconf          = nconf;
module.exports.cfg            = cfg;
module.exports.logFileLoading = logFileLoading;

logFileLoading(__filename);

