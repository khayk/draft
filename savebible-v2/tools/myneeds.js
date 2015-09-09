(function() {
  'use strict';

  var _   = require('lodash');
  var fs  = require('fs');
  var cfg = require('../config').cfg;
  var lb  = require('../lib/bible');
  var path   = require('path');

  var BBM = lb.BBM;
  var log = require('log4js').getLogger('tls');

  var PrettyRenderer = function(opts) {
    lb.TextRenderer.call(this, opts);
  };

  lb.inherit(PrettyRenderer, lb.TextRenderer);

  PrettyRenderer.prototype.defineVerseBegin = function(verse) {
    return '\r\n';
  };

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


  function findBook(dir, bid) {
    var files  = fs.readdirSync(dir, 'utf8');
    var rf = null;
    var found = false;
    files.forEach(function(file) {
      var res = lb.decodeFileName(file, true);
      if (found === false && res !== null && res.id === bid) {
        rf = path.join(dir,  file);
        found = true;
      }
    });
    return rf;
  }

  var dirNames = [
    //'en-kjv-usfm+ [saved]',
    'am-eab-usfm-from-text',
    'ru-synod-usfm-from-text [saved]'
  ];

  var bids = ['PRO', 'ECC', 'WIS', 'SIR'];

  bids.forEach(function(bid) {

    dirNames.forEach(function(dn) {
      var file = findBook(cfg.bibleDir(dn).from, bid);
      if (file === null) {
        log.info('failed to find book with id: %s', bid);
        return;
      }

      log.info(file);
      var book = lb.loadBook(file);
      lb.saveBook(book, cfg.tmpDir(), {
        renderer: new PrettyRenderer({
          textOnly: false
        }),
        extension: '.txt'
      });
    });

  });

  return;

  var input = cfg.bibleDir('zed').from;


  // var readline = require('readline');

  // var rd = readline.createInterface({
  //   input: fs.createReadStream(input + '/70-MATeng-kjv.usfm'),
  //   output: process.stdout,
  //   terminal: false
  // });

  // var cnt = 0;
  // rd.on('line', function(line) {
  //   //log.info(line);
  //   ++cnt;
  // });

  // rd.on('close', function() {
  //   log.info(cnt);
  // });

  // log.info('still working...');
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