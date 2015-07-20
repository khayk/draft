(function () {
  'use strict';

  var mkdirp   = require('mkdirp');
  var path     = require('path');
  var log4js   = require('log4js');
  var util     = require('util');
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
    ['ru-synod-usfm-from-text', 'ru'],
    ['en-kjv-usfm+', 'en'],
    ['am-eab-usfm-from-text', 'hy']
    //['zed', 'en']
    //['arm', 'hy']
  ];
  var bsArray = [];
  var pretty  = {};

  var opts = {cs: false, ww: false, op: 'and'};

  inputs.forEach(function(input) {
    measur.begin('loading bible: ' + input[0]);
    var bible = lb.loadBible(cfg.bibleDir(input[0]).from, {
      supportedOnly: true,
      strictFilename: false
    });
    measur.end();

    if (bible.lang === '')
      bible.lang = input[1];

    measur.begin('building index');
    var bs = new BibleSearch(bible);
    bsArray.push(bs);
    measur.end();

    pretty[bible.lang] = new help.SearchResultPrettifier(bible);
    pretty[bible.lang].displayStatistics(bs.search().getStatistics());
  });

  console.log(Object.keys(pretty));

  // var res = bs.query('help', opts);
  // srp.expend(res);
  var renderer = new lb.TextRenderer({textOnly: false});
  var rl = readline.createInterface(process.stdin, process.stdout);
  rl.setPrompt('ENTER> ');
  rl.prompt();

  rl.on('line', function(line) {
    var istr = line.trim();
    if (istr === 'EXIT')
      process.exit(0);

    if (istr.length > 0 && istr[0] === '*') {
      // perform navigation only
      istr = istr.substring(1).trim();
      bsArray.forEach(function(bs) {
        var verse = bs.nav(istr);
        if (verse !== null)
          log.info(verse.render(renderer));
      });
    }
    else {
      var notFound = bsArray.length;
      measur.begin('querying', istr);
      bsArray.forEach(function(bs) {
        var pp = pretty[bs.bible().lang];

        var res = bs.query(istr, opts);
        if (res.refs.length === 0)
          notFound--;
        else
          pp.expend(res);

        // print not found only if the text is not found in all available bibles
        if (notFound === 0)
          pp.expend(res);
      });
      measur.end();
    }

    rl.prompt();

  }).on('close', function() {
    console.log('Have a great day!');
    process.exit(0);
  });

}());


