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

  // Luke 18:19
  var VERSE = 'And Jesus said unto him, \\wj Why callest thou me good? none\n' +
    '\\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*';

  //var VERSE = '\\xy \\add 1\\nd 2\\wj 3\\wj*\\nd*\\add*4\\xy*';
  //var VERSE = '\\m 1\\x 2\\y 3\\z 4\\z*5\\y*6\\x*7\\m*';
  //var VERSE = '\\m this is \\x a simple text.\\y keep going.\\z hello\\z* world\\y*\\x* BYE!\\m*';

  var parser   = new USFMParser();
  var renderer = new USFMRenderer();

  var tmp      = VERSE;
  var str      = tmp.replace(/\n/g, ' ');

  var verse    = parser.parseVerse(str);
  var result   = verse.render(renderer);

  console.log('src:  %s', str);
  console.log('out:  %s', result);

}());


