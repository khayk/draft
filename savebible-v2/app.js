(function () {
  'use strict';

  var mkdirp = require('mkdirp');
  var path   = require('path');
  var log4js = require('log4js');
  var util   = require('util');

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

  var opts = {cs: false, ww: false, op: 'and'};

  measur.begin('loading bible');
  var bible = lb.loadBible(cfg.bibleDir('en-kjv-usfm+').from, {supportedOnly: true});
  measur.end();

  measur.begin('building index');
  var bs    = new BibleSearch(bible);
  measur.end();

  var srp   = new help.SearchResultPrettifier(bible);
  srp.displayStatistics(bs.search().getStatistics());

  var res = bs.query('help', opts);
  srp.expend(res);


}());


