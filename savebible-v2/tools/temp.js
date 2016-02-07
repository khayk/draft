var cfg      = require('../config').cfg;
var lb       = require('../lib/bible');
var rndr     = require('../lib/renderers');
var srch     = require('../lib/search-v2');
var cmn      = require('../lib/common');
var help     = require('../helpers');
var path     = require('path');
var fs       = require('fs-extra');
var _        = require('lodash');
var util     = require('util');
var readline = require('readline');

var measur = new help.Measurer();
var algo   = srch.algo;

var startupInitialization = function() {
  lb.MC.instance().linkTo('eng', 'en');
  measur.begin('node ready');
  measur.end();
};

startupInitialization();

var opts = [
  {folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     },
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  //{getCombined: false, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];

var name = 'en-kjv-usfm+';
var input  = cfg.bibleDir(name).from;
var output = cfg.bibleDir(name).to;

measur.begin('loading bible');
//var bible = lb.loadBible(input, {types: [3]});
//var book = lb.loadBook(path.join(input, '02-GENeng-kjv.usfm'));
var book = lb.loadBook(path.join(input, '87-PHMeng-kjv.usfm'));
measur.end();

var verse = book.getChapter(1).getVerse(1);
//var verse = bible.getBook('SIR').getChapter(1).getVerse(1);

var usfm = verse.render(opts[0].renderer);

console.log(usfm);


// | Abbreviation      |  Biblical reference                                   |
// |-------------------|:------------------------------------------------------|
// |John 9             |The Gospel according to John, chapter 9                |
// |John 9, 12         |John, chapters 9 and 12 (two chapters only)            |
// |John 9–12          |John, chapters 9 through 12 (four chaps. total)        |
// |John 9:12          |John, chapter 9, verse 12 (only one verse)             |
// |John 9:12b         |John, chapter 9, only the second part of verse 12      |
// |John 9:1, 12       |John, chapter 9, verses 1 and 12 only                  |
// |John 9:1-12        |John, chapter 9, the passage from verse 1 to verse 12  |
// |John 9:1-12, 36    |John, chapter 9, from verse 1 to verse 12, and verse 36|
// |John 9:1; 12:36    |John, only the two verses 9:1 and 12:36                |
// |John 9:1–12:36     |John, the whole section from 9:1 to 12:36              |
// |John 9:1-12; 12:3-6|John, the two passages 9:1-12 and 12:3-6               |
// |John 9:12-13       |John, chapter 9, verses 12 and 13 ("12 and following") |

var Reference = function(input) {
  this.ix = input.ix || 0;     // book index
  this.cn = input.cn || 0;     // chapter number
  this.vn = input.vn || 0;     // verse number
};

Reference.prototype.bid = function() {
  var bid = BBM.instance().idByOn(this.ix);
  if (bid === null)
    return 'null';
  return bid;
};

Reference.prototype.cn = function() {
  return this.cn;
};

Reference.prototype.vn = function() {
  return this.vn;
};

Reference.prototype.encode = function() {
  return _.padStart(this.ix, 2, '0') +
         _.padStart(this.cn, 3, '0') +
         _.padStart(this.vn, 3, '0');
};

Reference.prototype.decode = function(encoded) {
  this.ix = parseInt(encoded.substr(0, 2));
  this.cn = parseInt(encoded.substr(2, 3));
  this.vn = parseInt(encoded.substr(5, 3));
  return this;
};

Reference.prototype.str = function() {
  return this.bid() + this.cn() + ':' + this.vn();
};


ReferenceParser = (function() {
  var re = /([\S]+)\s(\d+)(?::(\d+)(?:\-(\d+))?)?/g;

  return {
    parse: function(str) {
      var ref = new Reference();
      var array = str.match(re);
      if (array === null)
        return bestGuess;
    }
  };
})();

ReferenceParser.parse('John');
// measur.begin('creating bible search');
// var bs = srch.BibleSearch(bible);
// measur.end();
