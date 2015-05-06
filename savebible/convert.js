/// <reference path="typings/node/node.d.ts"/>
var argv            = require('minimist')(process.argv.slice(2));
var fs              = require('fs');
var path            = require('path');
var util            = require('util');
var _               = require('underscore');
var lunr            = require('lunr');
var colors          = require('colors/safe');
var readline        = require('readline');

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

  var search = new Search();

  var renderer = new TextRenderer();
  var bibleStat = new BibleStats();
  var LCO = LC.instance();

  var inputs = [
    ['ru-synod-usfm-from-text', 'ru'],
    ['en-kjv-usfm+', 'en'],
    ['zed', 'en']
  ];

  var input = inputs[0];

  // en-kjv-usfm+, zed
  var bible = loadUSFMBible(dropboxDir + '/' + 'Data/' + input[0] + '/');
  measure('bible loading');
  bible.lang = input[1];
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


  // TODO: TEMPORARY PLACE
  function expend(word, refs, cs) {
    if (refs === null) {
      console.warn('word `%s` is not found.', word);
      return;
    }
    else {
      console.log('Found %d verses containing "%s"', refs.length, word);
    }

    var flags = 'gmi';
    if (cs === true) {
      flags = 'gm';
    }

    //var re = new RegExp('\\b' + word + '\\b', flags);
    var re = new RegExp(word, flags);

    refs.forEach(function(ref) {
      var dref = decodeRef(ref);
      var book = bible.getBook(BBM.instance().idByOn(dref.ix));
      var chap = book ? book.getChapter(dref.cn) : null;
      var verse = chap ? chap.getVerse(dref.vn) : null;

      if (verse) {
        var res = renderer.renderVerse(verse);
        var arr = re.exec(res);

        var str = '';
        var prevIndex = 0;
        var match = '';
        while (arr !== null) {
          match = arr[0];
          if (str.length === 0)
            str += res.substring(0, arr.index);
          else
            str += res.substring(prevIndex + match.length, arr.index);
          str += colors.green(match);
          prevIndex = arr.index;
          arr = re.exec(res);
          if (arr === null) {
            str += res.substr(prevIndex + match.length);
          }
        }
        console.log('%s.  %s', verse.id(), str);
      }
    });
  }



  var idx = lunr(function () {
    this.field('verse');
  });


  function fillDictionary(dict) {
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

            //search.index(text, ref);

            //idx.add({'verse': text, 'id': ref});

            // process every single word
            var wordsArray = text.split(' ');
            for (var i = 0; i < wordsArray.length; ++i) {
              search.add(wordsArray[i], ref);
              //dict.add(wordsArray[i], ref);
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

  // var d1 = new Dictionary();
  fillDictionary();
  measure('initialization');
  search.buildIndex();
  measure('index build');

  var opts = {cs: false, ww: false};
  //search.query('the', opts);
  measure('word search');


function benchmarkSearch() {
  var options = [
    {cs: true, ww: true},
    {cs: true, ww: false},
    {cs: false, ww: true},
    {cs: false, ww: false}
  ];

  options.forEach(function(opt) {

    console.log('Lookup all words in the bible with options: ', opt);

    var words = search.getDictionary().words();

    // iterate over all words
    words.forEach(function(word) {
      search.query(word, opt);
    });
    measure('total ' + words.length + ' words: ');
  });
}



var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('ENTER> ');
rl.prompt();

rl.on('line', function(line) {
  var istr = line.trim();
  if (istr === 'EXIT')
    process.exit(0);

  timer.stop();
  timer.start();
  var res = search.query(istr, opts);
  measure('querying: %s', istr);

  if (res !== null) {
    console.log(res.length);
    if (res.length < 40) {
      console.log(res);
      expend(istr, res, opts.cs);
    }
  } else {
    console.log('No matches found for:', istr);
  }

  rl.prompt();

}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});


}());

