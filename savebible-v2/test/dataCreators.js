var _      = require('lodash');
var lb     = require('../lib/bible.js');
var rndr   = require('../lib/renderers.js');

var BBM       = lb.BBM;
var Verse     = lb.Verse;
var Chapter   = lb.Chapter;
var Book      = lb.Book;
var Bible     = lb.Bible;
var Parser    = lb.Parser;

var verses = '\\v {{number}} \\wj Blessed \\+add are\\+add* the poor in ' +
  'spirit: for theirs is the kingdom of heaven.\\wj*';

var parser = new Parser();

var randomVerse = function() {
  return verses;
};

var createVerse = function(vstr) {
  var verse = parser.parseVerse(vstr);
  return verse;
};

var createChapter = function(numVerses, cn) {
  var chapter = parser.parseChapter('\\c ' + cn);
  for (var i = 1; i <= numVerses; ++i)
    chapter.addVerse(createVerse(randomVerse().replace('{{number}}', i)));
  return chapter;
};

var createBook = function(id, numChapters, numVerses) {
  var ncs  = numChapters || 1;
  var nvs  = numVerses || 1;
  var book = parser.parseBook('\\id ' + id);
  book.index = BBM.instance().itemById(book.te.id).index;
  for (var j = 1; j <= ncs; ++j) {
    book.addChapter(createChapter(nvs, j) );
  }
  return book;
};

exports.createVerse   = createVerse;
exports.createChapter = createChapter;
exports.createBook    = createBook;

require('../config').logFileLoading(__filename);

