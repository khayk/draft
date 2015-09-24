var _      = require('lodash');
var lb     = require('../lib/bible.js');
var rndr   = require('../lib/renderers.js');

var BBM       = lb.BBM;
var Verse     = lb.Verse;
var Chapter   = lb.Chapter;
var Book      = lb.Book;
var Bible     = lb.Bible;
var Parser    = lb.Parser;

var verses = '\\wj Blessed \\+add are\\+add* the poor in ' +
  'spirit: for theirs is the kingdom of heaven.\\wj*';

var parser = new Parser(true);


var randomVerse = function() {
  return verses;
};


var createVerse = function(vstr, vn) {
  var verse = parser.parseVerse(vstr);
  verse.number = vn;
  return verse;
};


var createChapter = function(numVerses, cn) {
  var chapter = new Chapter();
  chapter.number = cn;

  for (var i = 1; i <= numVerses; ++i)
    chapter.addVerse(createVerse(randomVerse(), i));
  return chapter;
};


var createBook = function(id, numChapters, numVerses) {
  var ncs  = numChapters || 1;
  var nvs  = numVerses || 1;
  var book = new Book();
  book.id  = id;
  book.index = BBM.instance().itemById(book.id).index;
  for (var j = 1; j <= ncs; ++j) {
    book.addChapter(createChapter(nvs, j) );
  }
  return book;
};

var x = createVerse(randomVerse());
console.log(x.render(new rndr.UsfmRenderer()));


exports.createVerse   = createVerse;
exports.createChapter = createChapter;
exports.createBook    = createBook;

require('../config').logFileLoading(__filename);

