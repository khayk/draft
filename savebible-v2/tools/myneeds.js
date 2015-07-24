(function() {
  'use strict';

  var _   = require('lodash');
  var fs  = require('fs');
  var cfg = require('../config').cfg;
  var lb  = require('../lib/bible');

  var BBM = lb.BBM;

  var PrettyRenderer = function(opts) {
    lb.TextRenderer.call(this, opts);
  };

  lb.inherit(PrettyRenderer, lb.TextRenderer);
  PrettyRenderer.prototype.renderVerseNumber = function(verse) {
    return _.padRight(verse.vn(), 3, ' ');
  };

  PrettyRenderer.prototype.renderChapterNumber = function(chap) {
    return '=== ' + chap.number + ' ===' + '\r\n\r\n';
  };

  PrettyRenderer.prototype.renderChapterEnd = function(chap) {
    return '\r\n';
  };

  PrettyRenderer.prototype.renderBookHeader = function(book) {
    return '\r\n== ' + book.te.name + ' ==' + '\r\n\r\n';
  };


  // var book = lb.loadBook(cfg.bibleDir('en-kjv-usfm+').from + '45-WISeng-kjv.usfm', {strictFilename: true});
  // var pretty = new PrettyRenderer({ textOnly: false });
  // var text = book.render(pretty);
  // fs.writeFileSync(cfg.tmpDir() + '45-WISeng-kjv.txt', text);

  var input = cfg.bibleDir('en-kjv-usfm').from;
  var guess = lb.guessBBM(input);
  BBM.activate(guess);

  var bible = lb.loadBible(input, {
    strictFilename: true
  });

  lb.saveBible(bible, './tmp/');

  // lb.saveBible(bible, './tmp/', {
  //   strictFilename: false,
  //   extension: 'txt',
  //   renderer: new PrettyRenderer({
  //     textOnly: false
  //   })
  // });

})();