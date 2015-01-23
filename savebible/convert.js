var fs           = require('fs');
var moduleBible  = require('./lib-modules/bible.js');

var Verse        = moduleBible.Verse;
var Chapter      = moduleBible.Chapter;
var Book         = moduleBible.Book;
var Parser       = moduleBible.Parser;
var USFMParser   = moduleBible.USFMParser;
var Renderer     = moduleBible.Renderer;
var TextRenderer = moduleBible.TextRenderer;
var USFMRenderer = moduleBible.USFMRenderer;

(function() {
  'use strict';

  try {
    var testBook = './data/01-GEN.usfm';
    var str = fs.readFileSync(testBook, {
      encoding: 'utf8'
    });

    var parser   = new USFMParser();
    var renderer = new USFMRenderer();
    var book = parser.parseBook(str);

    console.log('\n-----------------------------------------------------\n');
    console.log(book.render(renderer));
  } catch (e) {
    console.error('ERROR:', e);
  }

  //console.log(data);

  // Luke 18:19
  // var VERSE = 'And Jesus said unto him, \\wj Why callest thou me good? none\n' +
  //   '\\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*';

  // var VERSE = 'And God saw the light, that \\add it was\\add* good: and God\n' +
  // 'divided the light from the darkness.\\f +  \\ft the light from…: Heb. between the light and between the\n' +
  // 'darkness\\f* ok ';

  //var VERSE = '\\xy \\add 1\\nd 2\\wj 3\\wj*\\nd*\\add*4\\xy*';
  //var VERSE = '\\m 1\\x 2\\y 3\\z 4\\z*5\\y*6\\x*7\\m*';
  //var VERSE = '\\m this is \\x a simple text.\\y keep going.\\z hello\\z* world\\y*\\x* BYE!\\m*';

  // var parser   = new USFMParser();
  // var renderer = new USFMRenderer();

  // var tmp      = VERSE;
  // var str      = tmp.replace(/\n/g, ' ');

  // var verse    = parser.parseVerse(str);
  // var result   = verse.render(renderer);

  // console.log('src:  %s', str);
  // console.log('out:  %s', result);

}());


