var fs             = require('fs');
var path           = require('path');
var util           = require('util');
var _              = require('underscore');
//var agent          = require('webkit-devtools-agent');

var theBible       = require('./lib/bible.js');
var helper         = require('./lib/helper.js');
var common         = require('./lib/common.js');

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
var encodeRef      = theBible.encodeRef;
var decodeRef      = theBible.decodeRef;

// utils exports
var HiResTimer     = helper.HiResTimer;

(function() {

  'use strict';

  function createTestBook() {
    var parser = new USFMParser(true);
    var book = new Book();
    book.id = 'NUM';
    book.index = BBM.instance().entryById(book.id).index;

    for (var j = 1; j <= 10; ++j) {
      var chap = new Chapter();
      chap.number = j;

      for (var i = 1; i < 17; ++i) {
        var verse = parser.parseVerse(j + ' simple verse' + i);
        verse.number = i;
        chap.addVerse(verse);
      }

      book.addChapter(chap);
    }
    return book;
  }

  function createTestBible() {
    var bible = new Bible();
    bible.addBook(createTestBook());
    return bible;
  }

  var timer = new HiResTimer();

  function testReferences(count) {
    var cnt = count || 1;
    var book = createTestBook();
    var maxChap = book.numChapters();
    timer.start();

    console.log(util.inspect(process.memoryUsage()));
    for (var i = 0; i < cnt; ++i) {
      var rb = book.ref();
      if (rb.ix === 0) {
        console.log('OUCH!');
      }
      if (cnt < 10)
        console.log(rb);

      var chap  = book.getChapter(Math.floor((Math.random() * maxChap) + 1));
      var rc = chap.ref();
      if (rc.cn !== chap.number) {
        console.log('Invalid chapter REF');
      }
      if (cnt < 10)
        console.log(rc);

      var maxVerse = chap.numVerses();
      var verse = chap.getVerse(Math.floor((Math.random() * maxVerse) + 1));
      var rv = verse.ref();
      if (rc.cn !== chap.number || rv.vn !== verse.vn()) {
        console.log('Invalid verse REF');
      }
      if (cnt < 10)
        console.log(rv);

      var decRef1 = verse.ref();
      var encRef  = encodeRef(decRef1);
      var decRef2 = decodeRef(encRef);

      if (!_.isEqual(decRef1, decRef2)) {
        console.log(decRef1, 'not equal to', decRef2);
      }

      if (cnt < 10)
        console.log(encRef);
    }

    console.log(util.inspect(process.memoryUsage()));
    timer.stop();
    timer.report();
  }

  //var dropboxDir = 'c:/Users/Hayk/Dropbox (Personal)/'; // WORK
  var dropboxDir = 'c:/Users/Hayk/Dropbox/';            // LENOVO


  function launchStressTest() {
    var dataRoot = dropboxDir + 'Private/projects/bible project/data/real/';
    var samples  = 1;

    function launchRenderTest(bible) {
      //var renderer = new USFMRenderer();
      var renderer = new TextRenderer({textOnly: false});
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

      fs.writeFile('./data/raw/output.usfm', data);
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
              if ( BBM.instance().entryById(book.id).type !== 3)
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

      // _.each(BBM.instance().ids(), function(val, key) {
      //   var  found = false;
      //   bible.forEach(function(book) {
      //     if (book.id === key)
      //       found = true;
      //   });

      //   if (!found)
      //     console.log(key);
      // });

      launchRenderTest(bible);

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
      testReferences(8);

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

      // var Smth = function(opts) {
      //   // if (!options) {
      //   //   options = { encoding: null, flag: 'r' };
      //   // } else if (typeof options === 'string') {
      //   //   options = { encoding: options, flag: 'r' };
      //   // } else if (typeof options !== 'object') {
      //   //   throw new TypeError('Bad arguments');
      //   // }
      //   this.t = opts.t || true;
      // };
      // var s1 = new Smth({});
      // var s2 = new Smth({t: false});
      // var s3 = new Smth({t: true});

      // console.log(s1, s2, s3);
      // var str  = fs.readFileSync('aaa', {encoding: 'utf8'});
/*

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