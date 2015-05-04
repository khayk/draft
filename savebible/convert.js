/// <reference path="typings/node/node.d.ts"/>
var argv            = require('minimist')(process.argv.slice(2));
var fs              = require('fs');
var path            = require('path');
var util            = require('util');
var _               = require('underscore');
var lunr            = require('lunr');

//var agent         = require('webkit-devtools-agent');

var theBible        = require('./lib/bible.js');
var helper          = require('./lib/helper.js');
var common          = require('./lib/common.js');
var utils           = require('./utils/utils.js');
var cfg             = require('./configs.js').Configs;
var core            = require('./core.js');
var funcs           = require('./lib/functionality.js');
var search          = require('./lib/search.js');


var BBM             = theBible.BBM;
var Verse           = theBible.Verse;
var Chapter         = theBible.Chapter;
var Book            = theBible.Book;
var Bible           = theBible.Bible;
var USFMParser      = theBible.USFMParser;
var Renderer        = theBible.Renderer;
var TextRenderer    = theBible.TextRenderer;
var USFMRenderer    = theBible.USFMRenderer;
var Tags            = theBible.Tags;
var BibleStats      = theBible.BibleStats;
var encodeRef       = theBible.encodeRef;
var decodeRef       = theBible.decodeRef;

var createTestBook  = utils.createTestBook;
var createTestBible = utils.createTestBible;
var loadUSFMBible   = utils.loadUSFMBible;

// utils exports
var HiResTimer      = helper.HiResTimer;
var dropboxDir      = cfg.get_dropbox_dir();

var LC              = funcs.LC;
var Lexical         = funcs.Lexical;
var Dictionary      = funcs.Dictionary;

var Search          = search.Search;
var timer           = new HiResTimer();


(function() {
  'use strict';


  var bibleStat = new BibleStats();
  var LCO = LC.instance();
  var bible = loadUSFMBible(dropboxDir + '/' + 'Data/en-kjv-usfm/');
  measure('bible loading');
  bible.lang = 'en';
  LCO.load('./data/lexical.json');

  function measure(msg) {
    timer.stop();

    if (msg)
      console.log('--> %s <-- takse: %s', msg, timer.str());
    else
      console.log('elapsed: %s', timer.str());
    console.log(util.inspect(process.memoryUsage()) + '\n');

    timer.start();
  }


  var idx = lunr(function () {
    this.field('verse');
  });


  function fillDictionary(dict) {
    var renderer = new TextRenderer();
    var lexic = LC.instance().getLexical(bible.lang);

    var toc = bible.getToc();
    var ti = toc.firstItem();

    while (ti !== null) {
      var book = bible.getBook(ti.id);
      if (book !== null) {
        var chap = book.getChapter(1);
        while (chap !== null) {
          var verse = chap.getVerse(1);
          while (verse !== null) {
            var text = verse.render(renderer);
            var ref = encodeRef(verse.ref());
            text = lexic.removePunctuations(text);

            //idx.add({'verse': text, 'id': ref});

            // process every single word
            var wordsArray = text.split(' ');
            for (var i = 0; i < wordsArray.length; ++i) {
              dict.add(wordsArray[i], ref);
            }
            verse = verse.next();
          }
          chap = chap.next();
        }
      }
      ti = toc.nextItem(ti.id);
    }
  }

  // idx.pipeline.remove(lunr.stemmer);
  // idx.pipeline.remove(lunr.stopWordFilter);

  //console.log(idx);

  var d1 = new Dictionary();
  fillDictionary(d1);
  d1.optimize();
  measure('dictionary initialization');

  // var res = '';
  // d1.words().forEach(function(w) {
  //   res += w + '\n';
  // });
  // utils.fwrite('all_words.txt', res);
  // return;

  var readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout);

  rl.setPrompt('ENTER> ');
  rl.prompt();

  rl.on('line', function(line) {
    var istr = line.trim();
    if (istr === 'EXIT')
      process.exit(0);

    var res = idx.search(istr);
    console.log(res.length);

    // var res = search.searchWord(istr, opts);
    // console.log(res);
    // search.expend(istr, res, opts.cs);

    rl.prompt();

  }).on('close', function() {
    console.log('Have a great day!');
    process.exit(0);
  });

}());

