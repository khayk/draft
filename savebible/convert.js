var fs             = require('fs');
var path           = require('path');
var util           = require('util');
var _              = require('underscore');
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

  // Pad a number with leading zeros to "pad" places:
  //
  // @param number: The number to pad
  // @param pad: The maximum number of leading zeros
  //
  function padNumber(number, pad) {
    var N = Math.pow(10, pad);
    return number < N ? ('' + (N + number)).slice(1) : '' + number;
  }

  function getDecodedRef(verse) {
    return {
      ix: BBM.instance().onById(verse.bid()),
      cn: verse.cn(),
      vn: verse.vn()
    };
  }

  function encodeRef(cred) {
    return padNumber(cred.ix, 2) +
      padNumber(cred.cn, 3) +
      padNumber(cred.vn, 3);
  }

  function decodeRef(encodedRef) {
    return {
      ix: parseInt(encodedRef.substr(0, 2)),
      cn: parseInt(encodedRef.substr(2, 3)),
      vn: parseInt(encodedRef.substr(5, 3))
    };
  }


  var timer = new HiResTimer();

  var dropboxDir = 'c:/Users/Hayk/Dropbox (Personal)/'; // WORK
  //var dropboxDir = 'c:/Users/Hayk/Dropbox/';            // LENOVO


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

      // var stats = new BibleStats();
      // bible.forEach(function(book) {
      //   stats.bookTags(book);
      // });
      // stats.report();

      timer.stop();
      timer.report();
      console.log("PARSING COMPLETED.");

      var xxx = '';
      //_.each(BBM.instance().ids(), function(val, key) {
      bible.forEach(function(book) {
        var chap = book.getChapter(1);

        while (chap !== null) {
          var verse = chap.getVerse(1);
          while (verse !== null) {
            var decRef1 = getDecodedRef(verse);
            var encRef  = encodeRef(decRef1);
            var decRef2 = decodeRef(encRef);

            if (!_.isEqual(decRef1, decRef2)) {
              console.log(decRef1, 'not equal to', decRef2);
            }

            xxx += verse.id() + ' - ';
            xxx += encRef;
            xxx += '\n';

            verse = verse.next();
          }
          chap = chap.next();
        }
      });

      console.log(util.inspect(process.memoryUsage()));
      fs.writeFile('./data/raw/ids.txt', xxx);


      // _.each(BBM.instance().ids(), function(val, key) {
      //   var  found = false;
      //   bible.forEach(function(book) {
      //     if (book.id === key)
      //       found = true;
      //   });

      //   if (!found)
      //     console.log(key);
      // });


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

      isLanguage: function(lang) {
        return !_.isUndefined(langs_[lang]);
      },

      removePunctuations: function(lang, str) {
        if (!this.isLanguage(lang)) {
          console.log('unknown language: ', lang);
          return '';
        }
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


  function Dictionary() {
    var optimized_ = false;
    var index_     = {};
    var numWords_  = 0;
    var changed_   = 0;

    this.addWord = function(word, ref) {
      var lcword = word.toLowerCase();
      if (_.isUndefined(index_[lcword]))
        index_[lcword] = {c: 0, refs: []};
      index_[lcword].refs.push(ref);
      index_[lcword].c++;
      optimized_ = false;
      changed_   = true;
    };

    this.optimize = function() {

      _.each(index_, function(value, key) {

        // we need to sort refs and make them unique
        var o = value.refs;
        var n = {}, r = [];
        for (var i = 0; i < o.length; i++) {
          if (typeof n[o[i] === 'undefined']) {
            n[o[i]] = true;
            r.push(o[i]);
          }
        }

        // r is now unique
        value.refs = r;
        value.refs.sort();
      });

      numWords_ = Object.keys(index_).length;
      changed_ = false;
      optimized_ = true;
    };

    this.getRefs = function(word) {
      if (!optimized_)
        console.warn('Dictionary is not optimized. Call optimize!!!');
      var lcword = word.toLowerCase();
      var r = index_[lcword];
      if (_.isUndefined(r))
        return [];
      return r.refs;
    };

    this.getWords = function() {
      return Object.keys(index_);
    };

    this.getWordsCount = function() {
      return numWords_;
    };
  }

  var dict = new Dictionary();


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

    //console.log(util.inspect(process.memoryUsage()));

    // for (var i = 0; i < 1000000; i++) {
    //   res = Lexical.removePunctuations('hy', src);
    // }

    //console.log(util.inspect(process.memoryUsage()));
  }

  var src = {
    'an apple, an apricot, an ariplane': '04',
    'Apple is a good fruit.': '01',
    'Excellent!!!': '05',
    'How do to do?': '02',
    'Example of DUMMY text.': '03',
    'ok, ok ok. ok! ok?': '08',
    'apple, samsung': '06',
    'aa': '07'
  };

  function main() {
    try {

      // langTest();

      // _.each(src, function(value, key) {
      //   var pureWord = Lexical.removePunctuations('en', key);
      //   pureWord.split(' ').forEach(function(e) {
      //     dict.addWord(e, value);
      //   });
      // });

      // dict.optimize();

      // console.log(dict.getWords());
      // console.log(dict.getRefs('A'));
      // console.log(dict.getRefs('kikos'));
      // console.log('words: %d', dict.getWordsCount());

      launchStressTest();
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