(function () {
  'use strict';

  var lb = require('./lib/bible');
  //var config = require('./config');

  var parser = lb.createParser('usfm');

  var bible   = parser.parseBible(arr);
  bible.validate();

  var book    = parser.parseBook(str);
  book.validate();

  var chapter = parser.parseChapter(str);
  chapter.validate();

  var verse   = parser.parseVerse(str);
  verse.validate();

}());


