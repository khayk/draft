var cfg    = require('../config').cfg;
var path   = require('path');
var help   = require('../helpers');
var lb     = require('../lib/bible');
var _      = require('lodash');
var fs     = require('fs');

var MC     = lb.MC;
var measur = new help.Measurer();

var stress = function(fn, str, count) {
  if (_.isUndefined(count))
    count = 1;
  else if (!_.isNumber(count))
    count = 1;

  measur.begin(str);
  for (var i = 0; i < count; ++i) {
    fn();
  }
  measur.end();
};

var startupInitialization = function() {
  MC.instance().load(path.join(cfg.mediaDir(), 'meta'));
  MC.instance().linkTo('eng', 'en');

  measur.begin('node ready');
  measur.end();
};


var usfmRender = new lb.USFMRenderer();
var textRender = new lb.TextRenderer();
var bible = null;
var usfm  = '';

function benchmarkBibleLoad(name) {
  stress(function() {
    bible = lb.loadBible(cfg.bibleDir(name).from, {supportedOnly: true});
  }, 'reading bible from hdd', 1);
}

function benchmarkBibleRendering() {
  stress(function() {
    usfm = bible.render(usfmRender);
  }, 'rendering benchmark', 1);
}

startupInitialization();
benchmarkBibleLoad('en-kjv-usfm+');
benchmarkBibleRendering();

fs.writeFileSync(cfg.tmpDir() + 'out.txt', usfm);

// save as we want
lb.saveBible(bible, cfg.bibleDir('en-kjv-usfm+').to, {});
