var fs             = require('fs');
var path           = require('path');
var util           = require('util');
var _              = require('underscore')
//var agent          = require('webkit-devtools-agent');

var theBible       = require('./lib/bible.js');
var helper         = require('./lib/helper.js');

var BBM            = theBible.BBM;
var Verse          = theBible.Verse;
var Chapter        = theBible.Chapter;
var Book           = theBible.Book;
var Bible          = theBible.Bible;
var USFMParser     = theBible.USFMParser;
var Renderer       = theBible.Renderer;
var TextRenderer   = theBible.TextRenderer;
var USFMRenderer   = theBible.USFMRenderer;
var Tags           = theBible.Tags;
var BibleStats     = theBible.BibleStats;

// utils exports
var HiResTimer   = helper.HiResTimer;


(function() {

  'use strict';

  var timer = new HiResTimer();

  //var dropboxDir = 'c:/Users/Hayk/Dropbox (Personal)/'; // WORK
  var dropboxDir = 'c:/Users/Hayk/Dropbox/';            // LENOVO


  function launchStressTest() {
    var dataRoot = dropboxDir + 'Private/projects/bible project/data/real/';
    var samples  = 1;

    function launchRenderTest(bible) {
      var renderer = new USFMRenderer();
      //var renderer = new TextRenderer();
      console.log("RENDER STARTED...");
      timer.start();

      var data = '';
      bible.forEach(function(b) {
        for (var i = 0; i < samples; ++i) {
          data += b.render(renderer) + '\n';
        }
      });

      console.log("bible length: %d", data.length);
      timer.stop();
      timer.report();
      console.log("RENDER COMPLETED.");

      //fs.writeFile('./data/raw/output.usfm', data);
    }

    var bible = [];
    var parser   = new USFMParser(false);

    fs.readdir(dataRoot, function(err, files) {
      if (err)
        throw err;

      console.log("PARSING STARTED...");
      timer.start();

      files.forEach(function(p) {
        if (path.extname(p) === '.usfm') {
          var str  = fs.readFileSync(dataRoot + p, {encoding: 'utf8'});
          var book = null;
          for (var i = 0; i < samples; ++i) {
            try {
              book = parser.parseBook(str);
              bible.push(book);
            }
            catch (e) {
              console.log(e);
            }
          }
        }
      });

      console.log(util.inspect(process.memoryUsage()));

      var stats = new BibleStats();
      bible.forEach(function(book) {
        stats.bookTags(book);
      });
      stats.report();

      timer.stop();
      timer.report();
      console.log("PARSING COMPLETED.");

      _.each(BBM.instance().ids(), function(val, key) {
        var  found = false;
        bible.forEach(function(book) {
          if (book.id === key)
            found = true;
        });

        if (!found)
          console.log(key);
        //console.log(key, val);
        // if (bible.indexOf(key) === -1)
        //   console.log(key);
      });
      //launchRenderTest(bible);

      // bible = [];
      // parser = null;

      // setTimeout(function() {
      //   launchStressTest();
      // }, 1);
    });
  }

  function renderTest() {
    var testBook = './data/raw/70-MATeng-kjv-old.usfm';
    var str = fs.readFileSync(testBook, 'utf8');

    //var renderer   = new USFMRenderer();
    var renderer = new TextRenderer();


    // supported tags only
    var parser = new USFMParser(true);
    var book   = parser.parseBook(str);
    var data   = book.render(renderer);

    fs.writeFile('./data/raw/output.usfm', data);

  //  var verse = parser.parseVerse('\\zx \\zx*');
    // var verse = parser.parseVerse('\\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*\n' +
    //     '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and\n' +
    //     'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*\n' +
    //     '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the\n' +
    //     'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of\n' +
    //     'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*\n' +
    //     '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the\n' +
    //     'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.');
//    var verse = book.getChapter(27).getVerse(47);
    //var result = verse.render(renderer);
    //console.log(result);

    //var tc = new USFMCounter();
    //fs.writeFile('./data/raw/mt_27_47.txt', result);
    //tc.bookTags(book);
    //tc.verseTags(verse);
    //tc.report();

    // all tags
    // var parseAll = new USFMParser(false);
    // var bookAll  = parseAll.parseBook(str);
    // var dataAll  = bookAll.render(renderer);
    // fs.writeFile('./data/raw/outputAll.usfm', dataAll);
  }

  function onDiscovered(err, packs) {
    // all packages are discovered at this point

    packMgr.display();

    var lid = 'ru';
    var abbr = 'synod';
    var pack = packMgr.getPackage(lid, abbr);
    if (pack === null) {
      console.warn('package [%s, %s] not found', lid, abbr);
      return;
    }

    var bible = loadBible(pack);
    var renderer = new USFMRenderer();
    console.log(bible.render(renderer));
    //console.log(util.inspect(process.memoryUsage()));
  }

  var Lexical = (function() {
    var langs_ = {};

    return {
      addLanguage: function(entry) {
        var key = entry.lang;
        var data = entry.data;
        if (_.isUndefined(langs_[key])) {
          langs_[key] = {
            letters   : new RegExp('['  + data.letters + ']', 'gm'),
            nonLetters: new RegExp('[^' + data.letters + '\\s]', 'gm'),
            question  : data.question,
            emphasis  : data.emphasis
          };
        }
        else {
          throw 'Language \"' + entry.lang + '\" is already exists';
        }
      },

      getLanguages: function() {
        return Object.keys(langs_);
      },

      isKnownLanguage: function(lang) {
        return !_.isUndefined(langs_[lang]);
      },

      removePunctuations: function(lang, str) {
        return str.replace(langs_[lang].nonLetters, '').trim();
      }
    };
  })();


  var BibleSearch = function() {
    var bible_ = null;
    var dict_  = null;

    return {
      initialize: function(bible, dictionary) {

      },

      searchText: function(text) {
        var refs = [];
        return refs;
      },

      navigate: function(query) {

      }
    };
  };

  function langTest() {
    var lexFile = './data/lexical.json';
    var data = fs.readFileSync(lexFile, 'utf8');
    var js = JSON.parse(data);
    js.forEach(function(x) {
      Lexical.addLanguage(x);
    });


    console.log(Lexical.getLanguages());

    var src = 'Բար՜և!!! Ձեզ, ինչպես եք';
    var res = Lexical.removePunctuations('hy', src);

    console.log(util.inspect(process.memoryUsage()));

    // for (var i = 0; i < 1000000; i++) {
    //   res = Lexical.removePunctuations('hy', src);
    // }

    var y = 'ax004012';
    var id = y.substr(0, 2);
    var cn = parseInt(y.substr(2, 3));
    var vn = parseInt(y.substr(6, 3));

    console.log(id, cn, vn);
    console.log(util.inspect(process.memoryUsage()));
  }


  function main() {
    try {
      langTest();
      //launchStressTest();

      //agent.start();

      //renderTest();
      //packMgr.discover('./data/test/', onDiscovered);
    } catch (e) {
      console.error('ERROR:', e);
    }
  }

  main();

}());


/*

Ref(str) {
    this.id,
    this.cn,
    this.vn,
}

Bible {
    search(query, opt)  // returns an array of references, opt contains
}

TableOfContent {
  this.raw;

  getAll()
  getOne(id) // {}
}
 */



// 1 - GEN 1:1
// 2 - GEN 1:2
// ...
// 123 - NUM 2:4

// AA001001