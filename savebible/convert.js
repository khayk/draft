var colors         = require('colors');
var argv           = require('minimist')(process.argv.slice(2));
var fs             = require('fs');
var path           = require('path');
var util           = require('util');
var _              = require('underscore');
var randomWords    = require('random-words');

//var agent          = require('webkit-devtools-agent');

var theBible       = require('./lib/bible.js');
var helper         = require('./lib/helper.js');
var common         = require('./lib/common.js');
var utils          = require('./utils/utils.js');
var cfg            = require('./configs.js').Configs;
var core           = require('./core.js');
var funcs          = require('./lib/functionality.js');


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

var createTestBook  = utils.createTestBook;
var createTestBible = utils.createTestBible;
var loadUSFMBible   = utils.loadUSFMBible;

// utils exports
var HiResTimer     = helper.HiResTimer;
var dropboxDir     = cfg.get_dropbox_dir();

var LC         = funcs.LC;
var Lexical    = funcs.Lexical;
var Dictionary = funcs.Dictionary;

timer = new HiResTimer();

(function() {

  'use strict';


  function characterMap(str, map) {
    map = map || {};
    for (var i = 0; i < str.length; i++) {
      var ref = str.charAt(i);
      if (map[ref] === void 0)
        map[ref] = 1;
      else
        map[ref]++;
    }
    return map;
  }

  function mergeArrays(left, right) {
    var result = [],
      il = 0,
      ir = 0;

    while (il < left.length && ir < right.length) {
      if (left[il] < right[ir]) {
        result.push(left[il++]);
      }
      else {
        result.push(right[ir++]);
      }
    }

    return result.concat(left.slice(il)).concat(right.slice(ir));
  }

  // {refs: [], words: [], cs: true}

// ------------------------------------------------------------------------
//                             BIBLE SEARCH
// ------------------------------------------------------------------------
var BibleSearch = function() {
  var wtwm_     = {};    // word to word map


  var bible_   = null;
  var dict_    = null;  // lowercase words
  var lexic_   = null;
  var renderer = null;

  // word contains an object of the full words
  var wparts_ = {};

  // helper function to create internal metadata
  function addWordParts(word) {
    if (word.length < 4)
      return;
  }

  // initialize dictionary
  function initDictionary() {
    var toc = bible_.getToc();
    var ti = toc.firstItem();
    var ref = '';

    function addWord(word) {
      word = word.trim();

      // ignore empty strings
      if (word.length === 0)
        return;

      dict_.add(word, ref);

      var ciWord = word.toLowerCase();
      var obj = wtwm_[ciWord];
      if (_.isUndefined(obj)) {
        wtwm_[ciWord] = {};
      }
      wtwm_[ciWord][word] = null;
    }

    while (ti !== null) {
      var book = bible_.getBook(ti.id);
      if (book !== null) {
        var chap = book.getChapter(1);
        while (chap !== null) {
          var verse = chap.getVerse(1);
          while (verse !== null) {
            var text = verse.render(renderer);
            ref = encodeRef(verse.ref());
            text = lexic_.removePunctuations(text);

            // process every single word
            text.split(' ').forEach(addWord);
            verse = verse.next();
          }
          chap = chap.next();
        }
      }
      ti = toc.nextItem(ti.id);
    }

    dict_.optimize();
  }

  return {

    // initialize bible search module
    initialize: function(bible) {
      lexic_ = LC.instance().getLexical(bible.lang);
      if (lexic_ === null)
        throw 'Bible language is not specified or supported: ' + lang;
      bible_   = bible;
      dict_    = new Dictionary();
      renderer = new TextRenderer();

      initDictionary();
      console.log('Case   sensitive words count: %d', dict_.count());
      console.log('Case insensitive words count: %d', Object.keys(wtwm_).length);
      dict_.stat(150);
    },

    // search a single word and return array of references if succeeded,
    // otherwise returns null
    // {cs: bool, ww: bool}
    // cs -> case sensitive
    // ww -> whole word
    searchWord: function(word, opts) {
      if (!_.isString(word))
        throw new TypeError('Bad arguments');

      if (!opts) {
        opts = { cs: true, ww: true };
      }
      else if (!_.isObject(opts)) {
        throw new TypeError('Bad arguments');
      }
      else {
        if (typeof opts.cs !== 'boolean')
          opts.cs = true;
        if (typeof opts.ww !== 'boolean')
          opts.ww = true;
      }

      console.log(opts);
      opts = opts;
      var caseSensitive = opts.cs;
      var wholeWord     = opts.ww;

      if (caseSensitive) {
        if (wholeWord)
          return dict_.find(word);
        else {
          // try to find any word that starts with 'word'
          // TODO: implement later
          return null;
        }
      }

      var ciWord = word.toLowerCase();
      var csWords = wtwm_[ciWord];
      if (_.isUndefined(csWords))
        return null;

      var result = [];
      _.each(csWords, function(value, key) {
        var tmp = dict_.find(key);
        if (tmp !== null) {
          console.log('%s -> %j', key, tmp);
          result = _.union(result, tmp);
        }
      });

      result.sort();
      console.log('%s -> %j', ciWord, result);
      return result;
    },

    // search words in a text occording to rules in opts object
    // and return array of references if succeeded,
    // otherwise returns null
    searchText: function(text, opts) {
      if (!text)
        return null;

      // if one of the words in the text is absent from the dictionary
      // it indicates that we should return empty set
      var noResult = false;

      text = lexic_.removePunctuations(text);
      var wm = {}; // contains unique words
      var wa = []; // contains all words in an order they appeared in the text
      text.split(' ').forEach(function(word) {
        var obj = {w: word, r: null};
        wm[word] = obj;
        wa.push(obj);
      });

      if (wm.length === 0)
        return [];

      var refArrays = [];
      _.each(wm, function(value, key) {
        // do not search if overall outcome determined to be empty
        if (noResult)
          return;

        // value represents references
        value.r = dict_.find(key);
        if (value.r === null) {
          noResult = true;
          return;
        }

        refArrays.push(value.r);
        //console.log('%s -> %j', key, value);
      });

      if (noResult)
        return [];

      // combine results into one array
      var result = refArrays[0];
      // for (var i = 1; i < refArrays.length; ++i) {
      //   result = _.intersection(result, refArrays[i]);
      // }
      return result;
    },

    navigate: function(query) {
    },


    // TODO: TEMPORARY PLACE
    expend: function(word, refs, cs) {
      if (refs === null) {
        console.warn('word `%s` is not found.', word);
        return;
      }
      else {
        console.log('Found %d verses containing "%s"', refs.length, word);
      }

      var flags = 'gmi';
      if (cs === true) {
        flags = 'gm';
      }

      var re = new RegExp('\\b' + word + '\\b', flags);

      refs.forEach(function(ref) {
        var dref = decodeRef(ref);
        var book = bible_.getBook(BBM.instance().idByOn(dref.ix));
        var chap = book ? book.getChapter(dref.cn) : null;
        var verse = chap ? chap.getVerse(dref.vn) : null;

        if (verse) {
          var res = renderer.renderVerse(verse);
          var matches = res.match(re);
          if (matches === null) {
            console.error('--> NO MATCHES FOUND <--  %s', res);
            return;
          }
          //console.log('%s(%d) -> %s', word, matches.length, res);
        }
      });
    }
  };
};

  // function onDiscovered(err, packs) {
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }

  //   // all packages are discovered at this point
  //   core.PackManager.display();

  //   var lid = 'en';
  //   var abbr = 'tkjv';
  //   var pack = core.PackManager.getPackage(lid, abbr);
  //   if (pack === null) {
  //     console.warn('package [%s, %s] not found', lid, abbr);
  //     return;
  //   }

  //   var bible = core.Loader.loadBible(pack);
  //   var search = new BibleSearch();
  //   search.initialize(bible);

  //   var word = argv.word;
  //   var opts = {};
  //   if (argv.cs === 'false') {
  //     opts.cs = false;
  //   }
  //   if (argv.ww === 'false')
  //     opts.ww = false;

  //   var result = search.searchWord(word, opts);
  //   //console.log(result);
  //   search.expend(word, result);
  // }

  console.log(argv);
  var LCO = LC.instance();
  LCO.load('./data/lexical.json');
  //core.PackManager.scan('./data/test/', true, onDiscovered);

  timer.start();
  console.log(util.inspect(process.memoryUsage()));

  //var bible = createTestBible();
  var bible = loadUSFMBible(dropboxDir + '/' + 'Data/en-kjv-usfm+/');
  bible.lang = 'en';
  var search = new BibleSearch();

  timer.stop();
  timer.report();

  for (var i = 0; i < 1; ++i) {
    console.log(util.inspect(process.memoryUsage()));
    timer.start();
    search.initialize(bible);
    timer.stop();
    timer.report();
    console.log(util.inspect(process.memoryUsage()));
  }

}());



