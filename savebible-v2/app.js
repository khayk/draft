(function () {
  'use strict';

  var log4js = require('log4js');
  var util   = require('util');
  var fs     = require('fs');

  // configure logging and process with our modules
  log4js.configure('./config/log4js.json', {});

  var lb     = require('./lib/bible');
  var help   = require('./helpers');
  var cfg    = require('./config').cfg;


  var logger = log4js.getLogger('app');
  var bench  = new help.Benchmark();



  bench.begin( 'preparing to start');
  bench.end();

  //var config = require('./config');

  // var parser = lb.createParser('usfm');

  // var bible   = parser.parseBible(str);
  // bible.validate();

  // var book    = parser.parseBook(str);
  // book.validate();

  // var chapter = parser.parseChapter(str);
  // chapter.validate();

  // var verse   = parser.parseVerse(str);
  // verse.validate();

  var bible = null;


  //console.log(cfg.);

  bench.begin('reading bible from hdd');
  bible = lb.loadBible(cfg.en_kjv_usfm().from);
  bench.end();

  // lb.saveBible(folder);

  // bench.begin('doing some stuff');
  // bench.end();

  // bench.begin('doing some other stuff');
  // bench.end();

  // bench.begin('calculating real things');
  // bench.end();




  //console.log(util.inspect(cfg.get('en_kjv_usfm')));
}());


