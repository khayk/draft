(function () {
  'use strict';

  var path     = require('path');
  var log4js   = require('log4js');
  var readline = require('readline');
  var _        = require('lodash');

  var cfg      = require('./config').cfg;
  var lb       = require('./lib/bible');
  var rndr     = require('./lib/renderers');
  var search   = require('./lib/search');
  var help     = require('./helpers');
  var bi       = require('./tools/bible-info.js');

  var log      = log4js.getLogger('app');
  var measur   = new help.Measurer();

  var MC       = lb.MC;

  var startupInitialization = function() {
    MC.instance().load(path.join(cfg.mediaDir(), 'meta'));
    MC.instance().linkTo('eng', 'en');

    measur.begin('node ready');
    measur.end();
  };

  startupInitialization();

  var inputs = [
    ['en-kjv-usfm+',            'en', 'kjv+'],
    ['ru-synod-usfm-from-text [saved]', 'ru', 'synod'],
    ['am-eab-usfm-from-text',   'hy', 'eab']
  ];

  inputs.forEach(function(input) {
    measur.begin('loading bible: ' + input[0]);

    var bible = lb.loadBible(cfg.bibleDir(input[0]).from, {
      strictFilename: true
    });
    measur.end();

    if (bible.lang === '')
      bible.lang = input[1];
    bible.abbr = input[2];

    measur.begin('saving bible');

    var dir = cfg.tmpDir() + input[0];
    lb.saveBible(dir, bible);
    lb.saveBible(dir, bible, {
      extension: '.txt',
      renderer: new rndr.TextRenderer({
        textOnly: false
      })
    });
    bi.saveBibleSummary(dir, bible);

    measur.end();
  });



}());


