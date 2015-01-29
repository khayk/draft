var fs           = require('fs');
var path         = require('path');
var util         = require('util');
var moduleBible  = require('./lib-modules/bible.js');
var moduleUtils  = require('./lib-modules/utils.js');

var Verse        = moduleBible.Verse;
var Chapter      = moduleBible.Chapter;
var Book         = moduleBible.Book;
var Parser       = moduleBible.Parser;
var USFMParser   = moduleBible.USFMParser;
var Renderer     = moduleBible.Renderer;
var TextRenderer = moduleBible.TextRenderer;
var USFMRenderer = moduleBible.USFMRenderer;

/// utils exports
var HiResTimer        = moduleUtils.HiResTimer;

(function() {

  'use strict';

  var timer = new HiResTimer();
  var bible    = [];

  function launchStressTest() {
    var dropboxDir = 'c:/Users/Hayk/Dropbox (Personal)/'; // WORK
    //var dropboxDir = 'c:/Users/Hayk/Dropbox/';            // LENOVO
    var dataRoot = dropboxDir + 'Private/projects/bible project/data/real/';

    var count    = 1;
    var parser   = new USFMParser();
    var renderer = new USFMRenderer();

    function launchRenderTest(bible) {
      console.log("RENDER STARTED...");
      timer.start();

      var data = '';
      bible.forEach(function(b) {
        for (var i = 0; i < count; ++i) {
          data += b.render(renderer) + '\n';
        }
      });

      console.log("bible length: %d", data.length);
      timer.stop();
      timer.report();
      console.log("RENDER COMPLETED.");

      //fs.writeFile('./data/output.usfm', data);
    }


    fs.readdir(dataRoot, function(err, files) {
      if (err) throw err;
      console.log("PARSING STARTED...");
      timer.start();

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

      console.log(util.inspect(process.memoryUsage()));

      timer.stop();
      timer.report();
      console.log("PARSING COMPLETED.");
      launchRenderTest(bible);
      // bible.pop();
      // bible = [];
      // parser = null;
      // renderer = null;

      // setTimeout(function() {
      //   launchStressTest();
      // }, 10);
      console.log(util.inspect(process.memoryUsage()));
    });
  }

  // var Punctation = function() {

  // };

  function main() {
    try {
      var testBook = './data/70-MATeng-kjv-old.usfm';
      var str = fs.readFileSync(testBook, 'utf8');

      //var renderer   = new USFMRenderer();
      var renderer = new TextRenderer();


      /// supported tags only
      var parser = new USFMParser(true);
      var book   = parser.parseBook(str);
      var data   = book.render(renderer);

      var verse  = book.getVerse(27, 47);
      // fs.writeFile('./data/mt_27_47.txt', verse.render(renderer));
      fs.writeFile('./data/output.usfm', data);

      /// all tags
      // var parseAll = new USFMParser(false);
      // var bookAll  = parseAll.parseBook(str);
      // var dataAll  = bookAll.render(renderer);
      // fs.writeFile('./data/outputAll.usfm', dataAll);

      console.log(util.inspect(process.memoryUsage()));
    } catch (e) {
      console.error('ERROR:', e);
    }
  }

  main();

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


