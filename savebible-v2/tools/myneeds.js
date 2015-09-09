(function() {

  'use strict';

  var _    = require('lodash');
  var fs   = require('fs');
  var cfg  = require('../config').cfg;
  var lb   = require('../lib/bible');
  var rnd  = require('../lib/renderers');
  var path = require('path');
  var log  = require('log4js').getLogger('tls');


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
        renderer: new rnd.PrettyRenderer({
          textOnly: false
        }),
        extension: '.txt'
      });
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