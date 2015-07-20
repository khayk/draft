(function() {
  'use strict';

  var _   = require('lodash');
  var fs  = require('fs');
  var cfg = require('../config').cfg;
  var lb  = require('../lib/bible');

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
    return '\r\n=== ' + book.te.desc + ' ===' + '\r\n\r\n';
  };

  var book = lb.loadBook(cfg.bibleDir('en-kjv-usfm+').from + '45-WISeng-kjv.usfm', {strictFilename: true});

  var pretty = new PrettyRenderer({ textOnly: false });
  var text = book.render(pretty);

  fs.writeFileSync(cfg.tmpDir() + '45-WISeng-kjv.txt', text);

})();