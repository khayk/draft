(function () {
  'use strict';

  var path     = require('path');
  var fs       = require('fs');
  var log4js   = require('log4js');
  var readline = require('readline');
  var _        = require('lodash');

  var cfg      = require('./config').cfg;
  var lb       = require('./lib/bible');
  var rndr     = require('./lib/renderers');
  var help     = require('./helpers');
  var bi       = require('./tools/bible-info.js');

  var log      = log4js.getLogger('app');
  var measur   = new help.Measurer();

  var MC       = lb.MC;

  var startupInitialization = function() {
    MC.instance().linkTo('eng', 'en');
    measur.begin('node ready');
    measur.end();
  };

  startupInitialization();

  // produce combined output of the book
  var saveCombined = true;
  var overwriteToc = true;

  var opts = [{
    folder: 'pretty',
    extension: '.txt',
    getCombined: saveCombined,
    renderer: new rndr.PrettyRenderer()
  }, {
    folder: 'usfm',
    extension: '.usfm',
    getCombined: saveCombined,
    renderer: new rndr.UsfmRenderer(/*['zw', 'zx', 'f']*/)
  }, {
    folder: 'text',
    extension: '.txt',
    getCombined: saveCombined,
    renderer: new rndr.TextRenderer({
      textOnly: false
    })
  }, {
    folder: 'html',
    extension: '.html',
    getCombined: saveCombined,
    renderer: new rndr.HtmlRenderer()
  }];

  var inputs = [
    ['ru-synod-usfm-from-text', 'ru', 'synod'],
    ['en-kjv-usfm+',            'en', 'kjv'],
    ['am-eab-usfm-from-text',   'hy', 'eab']
  ];

  inputs.forEach(function(input) {
    measur.begin('loading bible: ' + input[0]);
    var bible = lb.loadBible(cfg.bibleDir(input[0]).from, {
      strictFilename: false,
      tocOverwrite: overwriteToc,
      lang: input[1]
    });
    measur.end();

    bible.abbr = input[2];

    measur.begin('saving bible');
    var dir = path.join(cfg.outputDir(), 'bibles', input[0]);
    opts.forEach(function(opt) {
      var bdir = path.join(dir, opt.folder);
      var content = lb.saveBible(bdir, bible, opt);
      if (opt.getCombined === true)
        fs.writeFileSync(path.join(dir, opt.folder) + '.all', content);
    });
    measur.end();

    bi.saveBibleSummary(dir, bible);
  });



}());


