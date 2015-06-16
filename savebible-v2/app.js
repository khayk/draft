(function () {
  'use strict';

  var log4js = require('log4js');

  var cfg    = require('./config');
  var lb     = require('./lib/bible');
  var help   = require('./helpers');

  var log    = log4js.getLogger('app');
  var bench  = new help.Benchmark();


  bench.begin('node ready');
  bench.end();


  var parser     = new lb.Parser();
  var usfmRender = new lb.USFMRenderer();
  var textRender = new lb.TextRenderer();



  var dataUSFM = require('./test/dataUSFM.js');
  var tvs        = dataUSFM.verses[3];
  var orig       = tvs.data.orig;
  var parsed     = tvs.data.parsed;

  //var verse = parser.parseVerse(orig);
  //console.log(verse.render(usfmRender));
  //return;

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

  var book = bible.getBook('GEN');
  var chap = book.getChapter(1);
  var verse = chap.getVerse(2);


  //log.info(verse.render(usfmRender));

  //log.info(chap.render(usfmRender));


  // bench.begin('rendering benchmark');
  // for (i = 0; i < 100; ++i) {
  //   book.render(usfmRender);
  // }
  // bench.end();

  // lb.saveBible(folder);

}());


