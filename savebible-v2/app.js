(function () {
  'use strict';

  var dataUSFM = require('./test/dataUSFM.js');

  var util   = require('util');
  var fs     = require('fs');
  var _      = require('lodash');
  var log4js = require('log4js');

  var cfg    = require('./config');
  var lb     = require('./lib/bible');
  var help   = require('./helpers');

  var log    = log4js.getLogger('app');
  var bench  = new help.Benchmark();

  bench.begin('node ready');
  bench.end();

  var tvs = dataUSFM.verses[3];
  var orig = tvs.data.orig;
  var parsed = tvs.data.parsed;

  var parser = new lb.Parser();

  // var verse = parser.parseVerse(orig);
  // verse.validate();

  //var usfmRender = new lb.USFMRenderer();
  //console.log(usfmRender.renderVerse(verse));


  // bench.begin('creating verses');
  // var arr= [];
  // for (var i = 0 ; i < 35000; ++i) {
  //   arr.push(new lb.Verse());
  // }
  // bench.end();

  // var textRender = new lb.TextRenderer();
  // textRender.renderVerse(verse);

  // var bible   = parser.parseBible(str);
  // bible.validate();

  // var book    = parser.parseBook(str);
  // book.validate();

  // var chapter = parser.parseChapter(str);
  // chapter.validate();

  var bible = null;


  //console.log(cfg.);

  bench.begin('reading bible from hdd');
  for (var i = 0 ; i < 1; ++i) {
    bible = lb.loadBible(cfg.cfg.en_kjv_usfm().from);
  }
  bench.end();
  // lb.saveBible(folder);

}());


