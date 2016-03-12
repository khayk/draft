(function() {

  'use strict';

  var _      = require('lodash');
  var fse    = require('fs-extra');
  var help   = require('../helpers');
  var cfg    = require('../config').cfg;
  var lb     = require('../lib/bible');
  var cmn    = require('../lib/common');
  var rndr   = require('../lib/renderers');
  var path   = require('path');
  var log    = require('log4js').getLogger('tls');
  var measur = new help.Measurer();

  var opts = [
    {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
    {folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                  },
    {folder: 'iusfm',   extension: '.usfm', renderer: new rndr.IndentedUsfmRenderer()         },
    {folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: false}) },
    {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
  ];

  var dirNames = [
    'am-eab-usfm-from-text',
    'en-kjv-usfm+',
    'ru-synod-usfm-from-text [saved]'
  ];

  var bids = ['SIR'];
  //var bids = ['PRO', 'ECC', 'WIS', 'SIR'];
  if (bids.length === 0) {
    _.each(lb.BBM.instance().ids(), function(val, key) {
      bids.push(key);
    });
  }

  lb.MC.instance().linkTo('eng', 'en');

  dirNames.forEach(function(dn) {
    measur.begin('processing: ' + dn);

    bids.forEach(function(bid) {
      var file = lb.findBook(cfg.bibleDir(dn).from, bid);
      if (file === null) {
        log.info('failed to find book with id: %s', bid);
        return;
      }

      if (bids.length < 5)
        log.info(file);
      var book = lb.loadBook(file, {
        ignoredTags: cmn.TH.arrayIgnored()
      });

      var meta = lb.MC.instance().getMeta(book.lang);
      var te = meta.toc.get(book.id());
      book.updateIds(te);

      opts.forEach(function(opt) {
        var dir = path.join(cfg.tmpDir(), opt.folder);
        fse.mkdirsSync(dir);
        lb.saveBook(dir, book, opt);
      });

    });

    measur.end();
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