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

    beginMeasure('total ' + words.length + ' words: ');

    // iterate over all words
    words.forEach(function(word) {
      search.query(word, opt);
    });
    endMeasure();
  });
}

// -----------------------------------------------------------------------
//                          START MAIN
// -----------------------------------------------------------------------
var inputs = [
  //['ru-synod-usfm-from-text', 'ru'],
  //['en-kjv-usfm+', 'en']
  //['am-eab-usfm-from-text', 'hy']
  ['zed', 'en']
  //['arm', 'hy']
];

var bsArray = [];

inputs.forEach(function(input) {
  beginMeasure('bible loading: ' + input[0]);
  var bible = loadUSFMBible(dropboxDir + '/' + 'Data/' + input[0] + '/');
  endMeasure();

  bible.lang = input[1];
  LCO.load('./data/lexical.json');

  beginMeasure('initialization');
  bsArray.push(new BibleSearch(bible));
  endMeasure();
});

var opts = {cs: false, ww: false, op: 'and'};

// beginMeasure('Seaching all words');
// bs.searchAllWords();
// endMeasure();

// var res = bs.query('earth', opts);
// bs.expend(res);
// return;


var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('ENTER> ');
rl.prompt();

rl.on('line', function(line) {
  var istr = line.trim();
  if (istr === 'EXIT')
    process.exit(0);

  beginMeasure('querying: %s', istr);
  bsArray.forEach(function(bs) {
    var res = bs.query(istr, opts);
    bs.expend(res);
  });
  endMeasure();

  rl.prompt();

}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});


}());

