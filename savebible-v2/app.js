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

  var Lexical = function() {
    this.lang = '';
  };

  var Meta = function() {
    this.lex = '';
    this.toc = new TableOfContents();
  };

  // load meta data from the give json file
  Meta.prototype.load = function(file) {
  };


  var MetaCollection = function() {
  };

  MetaCollection.prototype.load = function(dir) {
  };



// var bible = loadBible();
// var meta  = loadMeta();

// // {mode: overwrite | missing}
// var report  = populate(bible, mapping, opt);

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
    bible = lb.loadBible(cfg.inputDir() + 'en-kjv-usfm+/', {supportedOnly: true});
  }
  bench.end();

  var usfm = '';
  bench.begin('rendering benchmark');
  for (i = 0; i < 1; ++i) {
    usfm = bible.render(usfmRender);
  }
  bench.end();

  fs.writeFileSync(cfg.tmpDir() + 'out.txt', usfm);

  //lb.saveBible(folder);

}());


