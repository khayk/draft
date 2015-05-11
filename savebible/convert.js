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
var BibleSearch     = search.BibleSearch;
var timer           = new HiResTimer();

(function() {

'use strict';


var renderer = new TextRenderer();
var bibleStat = new BibleStats();
var LCO = LC.instance();


// -----------------------------------------------------------------------
function beginMeasure(msg) {
  timer.start();
  if (msg)
    console.log('==== %s ====', msg);
}

// -----------------------------------------------------------------------
function endMeasure() {
  timer.stop();
  console.log('elapsed: %s', timer.str());
  console.log(util.inspect(process.memoryUsage()) + '\n');
}


// -----------------------------------------------------------------------
function createRegex(word, lang, cs, ww) {
  var flags = 'gmi';
  if (cs === true) {
    flags = 'gm';
  }

  var letters = LCO.getLexical(lang).getLetters();
  var str;
  if (ww === true)
    str = '([^%letters%]|^)%word%(?=([^%letters%]|$))';
  else
    str = '([^%letters%]|^)%word%';
  str = str.replace(/%letters%/gm, letters);
  str = str.replace(/%word%/gm, word);

  return new RegExp(str, flags);
}


// -----------------------------------------------------------------------
// colorize
function colorize(res, part, cs, ww) {
  var re = createRegex(part, bible.lang, cs, ww);    // new RegExp(part, flags);
  var arr = re.exec(res);

  if (arr === null)
    return res;

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
  return str;
}


// -----------------------------------------------------------------------
function expendBSR(result) {
  var count = result.refs.length;
  console.log('%d results for `%s`', count, result.orig);

  if (count >= 50)
    return;

  result.refs.forEach(function(ref) {

    var dref = decodeRef(ref);
    var book = bible.getBook(BBM.instance().idByOn(dref.ix));
    var chap = book ? book.getChapter(dref.cn) : null;
    var verse = chap ? chap.getVerse(dref.vn) : null;
    if (verse) {
      var res = renderer.renderVerse(verse);
      result.words.forEach(function(w) {
        res = colorize(res, w, result.opts.cs, result.opts.ww);
      });

      console.log('%s.  %s', common.padString(verse.id(), '           ', true), res);
    }
  });
}

// -----------------------------------------------------------------------
//                          START MAIN
// -----------------------------------------------------------------------
var inputs = [
  ['ru-synod-usfm-from-text', 'ru'],
  ['en-kjv-usfm+', 'en'],
  ['am-eab-usfm-from-text', 'hy'],
  ['zed', 'en']
];

var input = inputs[3];

beginMeasure('bible loading');
var bible = loadUSFMBible(dropboxDir + '/' + 'Data/' + input[0] + '/');
endMeasure();

bible.lang = input[1];
LCO.load('./data/lexical.json');

beginMeasure('initialization');
var bs = new BibleSearch(bible);
endMeasure();

  //search.displayStatistics();

var opts = {cs: true, ww: true, op: 'or'};

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


var res = bs.query('the earth', opts);
expendBSR(res);
return;


var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('ENTER> ');
rl.prompt();

rl.on('line', function(line) {
  var istr = line.trim();
  if (istr === 'EXIT')
    process.exit(0);

  beginMeasure('querying: %s', istr);
  var res = bs.query(istr, opts);
  endMeasure();

  expendBSR(res, opts);

  // var refs = res.refs;
  // if (refs !== null) {

  //   console.log(refs.length);
  //   if (refs < 80) {
  //     console.log(refs);
  //     expend(istr, refs, opts.cs);
  //   }
  // } else {
  //   console.log('No matches found for:', istr);
  // }

  rl.prompt();

}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});


}());

