(function() {

  'use strict';

  var _    = require('lodash');
  var fs   = require('fs');
  var cfg  = require('../config').cfg;
  var lb   = require('../lib/bible');
  var rndr = require('../lib/renderers');
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
    'en-kjv-usfm+'
    //'am-eab-usfm-from-text',
    //'ru-synod-usfm-from-text [saved]'
  ];

  //var bids = ['PRO', 'ECC', 'WIS', 'SIR'];
  var bids = ['SIR'];

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
        renderer: new rndr.PrettyRenderer(),
        extension: '.txt'
      });
    });
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