(function () {
  'use strict';

  var mkdirp = require('mkdirp');
  var path   = require('path');
  var log4js = require('log4js');
  var util   = require('util');
  var fs     = require('fs');
  var _      = require('lodash');

  var cfg    = require('./config').cfg;
  var lb     = require('./lib/bible');
  var help   = require('./helpers');

  var log    = log4js.getLogger('app');
  var bench  = new help.Benchmark();

  var BBM        = lb.BBM;
  var MC         = lb.MC;


  var stress = function(fn, str, count) {
    if (_.isUndefined(count))
      count = 1;
    else if (!_.isNumber(count))
      count = 1;

    bench.begin(str);
    for (var i = 0; i < count; ++i) {
      fn();
    }
    bench.end();
  };


  var startupInitialization = function() {
    MC.instance().load(path.join(cfg.mediaDir(), 'meta'));
    MC.instance().linkTo('eng', 'en');

    bench.begin('node ready');
    bench.end();
  };

  startupInitialization();

  var usfmRender = new lb.USFMRenderer();
  var textRender = new lb.TextRenderer();
  var bible = null;

  stress(function() {
    bible = lb.loadBible(cfg.inputDir() + 'en-kjv-usfm+/', {supportedOnly: true});
  }, 'reading bible from hdd', 1);


  var usfm = '';
  stress(function() {
    usfm = bible.render(usfmRender);
  }, 'rendering benchmark', 1);

  fs.writeFileSync(cfg.tmpDir() + 'out.txt', usfm);
  lb.saveBible(folder);

}());


