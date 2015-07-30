(function () {
  'use strict';

  var path     = require('path');
  var log4js   = require('log4js');
  var readline = require('readline');

  var cfg    = require('./config').cfg;
  var lb     = require('./lib/bible');
  var search = require('./lib/search');
  var help   = require('./helpers');

  var log    = log4js.getLogger('app');
  var measur = new help.Measurer();

  var MC          = lb.MC;
  var BibleSearch = search.BibleSearch;

  var startupInitialization = function() {
    MC.instance().load(path.join(cfg.mediaDir(), 'meta'));
    MC.instance().linkTo('eng', 'en');

    measur.begin('node ready');
    measur.end();
  };

  startupInitialization();

  var inputs = [
    //['en-kjv-usfm+',              'en', 'kjv']
    //['ru-synod-usfm-from-text', 'ru', 'synod'],
    //['am-eab-usfm-from-text',   'hy', 'eab']
    ['zed', 'en', 'zed']
    //['arm', 'hy', 'arm']
  ];

  var opts = {cs: false, ww: false, op: 'and'};

  inputs.forEach(function(input) {
    measur.begin('loading bible: ' + input[0]);

    var bible = lb.loadBible(cfg.bibleDir(input[0]).from, {
      supportedOnly: true,
      strictFilename: false
    });
    measur.end();

    // if (bible.lang === '')
    //   bible.lang = input[1];
    bible.abbr = input[2];

    measur.begin('saving bible');
    lb.saveBible(bible, cfg.tmpDir() + input[0]);
    // lb.saveBible(bible, cfg.tmpDir() + input[0], {
    //   extension: '.txt',
    //   renderer: new lb.TextRenderer({
    //     textOnly: false
    //   })
    // });
    measur.end();
  });



}());


