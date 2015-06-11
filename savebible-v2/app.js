(function () {
  'use strict';

  var lb = require('./lib/bible');
  //var config = require('./config');

  var parser = lb.createParser('usfm');

  var bible   = parser.parseBible('folder');
  var book    = parser.parseBook('file');
  var chapter = parse.parseChapter('string');
  var verse   = parse.parseVerse('string');

  book.fromFile('file name');
  book.fromStream('stream');
  book.fromString('string');

  var verse = new Verse();
  var chapter = new Chapter();
}());


