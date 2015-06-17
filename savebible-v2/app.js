(function () {
  'use strict';

  var log4js = require('log4js');
  var util   = require('util');
  var fs     = require('fs');

  var cfg    = require('./config');
  var lb     = require('./lib/bible');
  var help   = require('./helpers');

  var log    = log4js.getLogger('app');
  var bench  = new help.Benchmark();


  bench.begin('node ready');
  bench.end();


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
    bible = lb.loadBible(cfg.cfg.en_kjv_usfm().from);
  }
  bench.end();

  var book = bible.getBook('GEN');
  var chap = book.getChapter(1);
  var verse = chap.getVerse(2);

  //log.info(verse.render(usfmRender));
  //log.info(chap.render(usfmRender));

  var x = '';
  bench.begin('rendering benchmark');
  for (i = 0; i < 33; ++i) {
    x = bible.render(usfmRender);
  }
  bench.end();

  fs.writeFileSync('out.txt', x);
  // lb.saveBible(folder);

}());


