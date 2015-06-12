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


  bench.begin('node ready');
  bench.end();

  var BBM        = lb.BBM;

  var parser     = new lb.Parser(true);
  var usfmRender = new lb.USFMRenderer();
  var textRender = new lb.TextRenderer();

  // var dataUSFM = require('./test/dataUSFM.js');
  // var tvs        = dataUSFM.verses[1];
  // var orig       = tvs.data.orig;
  // var parsed     = tvs.data.parsed;

  // var verse = parser.parseVerse(orig);
  // console.log(verse.node.toString());
  //console.log(verse.render(usfmRender));
  // console.log(verse.render(textRender));
  // console.log(verse.render(htmlRender));
  // return;

  var bible = null;

  bench.begin('reading bible from hdd');
  for (var i = 0; i < 1; ++i) {
    bible = lb.loadBible(cfg.inputDir() + 'en-kjv-usfm+/');
  }
  bench.end();

  // var book = bible.getBook('GEN');
  // var chap = book.getChapter(1);
  // var verse = chap.getVerse(2);

  var usfm = '';
  bench.begin('rendering benchmark');
  for (i = 0; i < 1; ++i) {
    usfm = bible.render(usfmRender);
  }
  bench.end();

  fs.writeFileSync(cfg.tmpDir() + 'out.txt', usfm);


// var bible = loadBible();
// var defMeta = loadDefaultMeta();

// // {mode: overwrite | missing}
// var report  = populate(bible, mapping, opt);

  //lb.saveBible(folder);

}());


