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


  PrettyRenderer.prototype.defineVerseView = function(vo) {
    if (!this.textOnly)
      vo.id = _.padRight(vo.verse.vn(), 3, ' ');
  };

  PrettyRenderer.prototype.defineChapterBegin = function(chap) {
    return '\r\n\r\n';
  };

  PrettyRenderer.prototype.defineChapterView = function(vo) {
    vo.id = '=== ' + vo.chapter.number + ' ===\r\n';
  };

  PrettyRenderer.prototype.defineBookBegin = function(book) {
    return '\r\n';
  };

  PrettyRenderer.prototype.defineBookView = function(vo) {
    vo.header = '== ' + vo.book.te.name + ' ==' + '\r\n';
  };


  var books = [
    {bibleName: 'en-kjv-usfm+ [saved]', bookName: '32-SIReng-kjv.usfm'},
    {bibleName: 'am-eab-usfm-from-text', bookName: '32-SIRhy-eab.usfm'},
    {bibleName: 'ru-synod-usfm-from-text [saved]', bookName: '32-SIRru-synod.usfm'}
  ];


  _.each(books, function(key, val) {
    var book = lb.loadBook(cfg.bibleDir(key.bibleName).from + key.bookName);
    lb.saveBook(book, cfg.tmpDir(), {
      renderer: new PrettyRenderer({
        textOnly: false
      })
    });
  });

  return;

  // var book = lb.loadBook(cfg.bibleDir('en-kjv-usfm+').from + '45-WISeng-kjv.usfm', {strictFilename: true});
  // var pretty = new PrettyRenderer({ textOnly: false });
  // var text = book.render(pretty);
  // fs.writeFileSync(cfg.tmpDir() + '45-WISeng-kjv.txt', text);

  var input = cfg.bibleDir('zed').from;


  // var readline = require('readline');

  // var rd = readline.createInterface({
  //   input: fs.createReadStream(input + '/70-MATeng-kjv.usfm'),
  //   output: process.stdout,
  //   terminal: false
  // });

  // var cnt = 0;
  // rd.on('line', function(line) {
  //   //console.log(line);
  //   ++cnt;
  // });

  // rd.on('close', function() {
  //   console.log(cnt);
  // });

  // console.log('still working...');
  // return;


  // var guess = lb.guessBBM(input);
  // BBM.activate(guess);

  var bible = lb.loadBible(input, {
    strictFilename: true
  });

  //lb.saveBible(bible, './tmp/');

  lb.saveBible(bible, './tmp/', {
    strictFilename: false,
    extension: '.txt',
    renderer: new PrettyRenderer({
      textOnly: false
    })
  });

  //\dc_...\dc*
  // \r
  // \q#(_text...)
  // \b
  // \p(_text...)
  // \ie                 Introduction end.
  // \ip_text...         Introduction paragraph.
  // \s#_text...         Section heading.
  // \d_text...          Descriptive title

})();