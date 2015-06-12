var nconf = require('nconf');
var path  = require('path');

nconf.argv()
  .env()
  .file({
    file: path.join(__dirname, 'config.json')
  });


var cfg = (function() {
  var data = nconf.get('data');

  return {
    en_kjv_usfm: function() {
      var name_ = 'en-kjv-usfm';
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

module.exports.nconf = nconf;
module.exports.cfg   = cfg;
