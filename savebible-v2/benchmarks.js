var path   = require('path');
var _      = require('lodash');
var fs     = require('fs');

var cfg    = require('./config').cfg;
var help   = require('./helpers');
var lb     = require('./lib/bible');
var srch   = require('./lib/search');

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

var bible = null;

function benchmarkBibleLoad(name) {
  stress(function() {
    bible = lb.loadBible(cfg.bibleDir(name).from, {supportedOnly: false});
  }, 'reading bible from hdd', 1);
}

var usfmRenderer = new lb.USFMRenderer();
var textRenderer = new lb.TextRenderer();

function benchmarkBibleRendering(type) {
  var result = '';
  var renderer = (type === 'usfm' ? usfmRenderer : textRenderer);
  stress(function() {
    result = bible.render(renderer);
  }, type + ' rendering benchmark', 1);
  return result;
}

function benchmarkAllWordsSearch() {
  var search = null;

  stress(function() {
    search = new srch.BibleSearch(bible);
  }, 'initializing searching infrastructure', 1);

  stress(function() {
    var maxLength = 0;
    var resWord;

    //console.log(search.search().getDictionary().words());
    search.search().getDictionary().words().forEach(function(w) {
      var res = search.query(w);
      if (maxLength < res.refs.length) {
        maxLength = res.refs.length;
        resWord = w;
      }
    });

    console.log("Max length: %d, word: %s", maxLength, resWord);
  }, 'searching words', 1);
}

startupInitialization();
benchmarkBibleLoad('en-kjv-usfm+');

var usfm = benchmarkBibleRendering('usfm');
//var text = benchmarkBibleRendering('text');
//benchmarkAllWordsSearch();

fs.writeFileSync(cfg.tmpDir() + 'usfm', usfm);
//fs.writeFileSync(cfg.tmpDir() + 'text', text);

// save as we want
//lb.saveBible(bible, cfg.bibleDir('en-kjv-usfm+').to, {});
