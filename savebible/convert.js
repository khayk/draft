var fs           = require('fs');
var path         = require('path');
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

  function launchStressTest() {
    var dataRoot = 'c:/Users/Hayk/Dropbox/Private/projects/bible project/data/real/';
    var bible    = [];
    var count    = 20;

    fs.readdir(dataRoot, function(err, files) {
      console.log("PARSING STARTED...");

      files.forEach(function(p) {
        if (path.extname(p) === '.usfm') {
          var str  = fs.readFileSync(dataRoot + p, {encoding: 'utf8'});
          var book = null;
          for (var i = 0; i < count; ++i) {
            book = parser.parseBook(str);
          }
          bible.push(book);
        }
      });

      console.log("PARSING COMPLETED.");
      launchRenderTest(bible);
    });

    var parser   = new USFMParser();
    var renderer = new USFMRenderer();

    function launchRenderTest(bible) {
      console.log("RENDER STARTED...");
      bible.forEach(function(b) {
        for (var i = 0; i < count; ++i) {
          var data = book.render(renderer);
        }
      });
      console.log("RENDER COMPLETED.");
    }
  }

  try {
    launchStressTest();

    var testBook = './data/70-MATeng-kjv.usfm';
    var str = fs.readFileSync(testBook, {encoding: 'utf8'});

    var parser   = new USFMParser();
    var renderer = new USFMRenderer();
    var book     = parser.parseBook(str);

    //console.log('\n-----------------------------------------------------\n');
    var data = book.render(renderer);
    //console.log();

    fs.writeFile('./data/output.usfm', data);

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


