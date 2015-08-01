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



  function preformattedTOC(bible) {
    var res = '';
    var prePadded = '      ';

    var tbs = 0;  // total books count
    var tcs = 0;  // total chapters count
    var tvs = 0;  // total verses count

    bible.books.forEach(function(b) {
      var nvs = 0;
      b.chapters.forEach(function(c) {
        nvs += c.numVerses();
      });

      res += padString(b.id,            prePadded, false) +
             padString(b.numChapters(), prePadded, false) +
             nvs + '\r\n';

      tcs += b.numChapters();
      tvs += nvs;
      tbs++;
    });

    res +=  '\r\n' +
            padString(tbs,  prePadded, false) +
            padString(tcs,  prePadded, false) +
            tvs + '\r\n';

    return res;
  }

  function preformattedBook(book) {
    var maxVN = 0, maxCN = 0;
    book.chapters.forEach(function(c) {
      if (maxCN < c.number)
        maxCN = c.number;
      c.verses.forEach(function(v) {
        if (maxVN < v.number)
          maxVN = v.number;
      });
    });

    var wvn = maxVN.toString().length + 1, wcn = maxCN.toString().length + 1;
    var pln = wvn > wcn ? wvn : wcn;

    var cline = '', vline = '';
    book.chapters.forEach(function(c) {
      cline += padWithSymbol(c.number, pln, ' ');
      vline += padWithSymbol(c.numVerses(), pln, ' ');
    });

    var prePadded = '     ';
    var res = padString(book.id, prePadded, false) + cline + '\r\n' +
              padString('',      prePadded, false) + vline;
    return res;
  }

  function preformattedBible(bible) {
    var res = briefInfo(bible) + '\r\n\r\n';
    bible.books.forEach(function(b) {
      res += summerizeBook(b) + '\r\n\r\n';
    });
  }

  function saveBibleSummary(file, bible) {

  }


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
      knownTagsOnly:  true,
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


