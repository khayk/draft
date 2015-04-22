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

var createTestBook = utils.createTestBook;

// utils exports
var HiResTimer     = helper.HiResTimer;
var dropboxDir     = cfg.get_dropbox_dir();

var LC         = funcs.LC;
var Lexical    = funcs.Lexical;
var Dictionary = funcs.Dictionary;

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



  var BibleSearch = function() {
    var bible_ = null;
    var dict_  = null;
    var lexic_ = null;

    function initDictionary() {
      var renderer = new TextRenderer();
      var toc = bible_.getToc();
      var ti = toc.firstItem();
      var ref = '';

      function addWord(word) {
        dict_.add(word, ref);
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
              text = text.toLowerCase();

              // process every single word
              text.split(' ').forEach(addWord);
              verse = verse.next();
            }
            chap = chap.next();
          }
        }
        ti = toc.nextItem(ti.id);
      }
      //console.log(toc.numItems());
      dict_.optimize();
    }

    return {
      initialize: function(bible) {
        lexic_ = LC.instance().getLexical(bible.lang);
        if (lexic_ === null)
          throw 'Bible language is not specified or supported: ' + lang;
        bible_ = bible;
        dict_  = new Dictionary();
        initDictionary();
        console.log('WORDs count: %d', dict_.count());

        // var words = dict_.words();
        // var inds = [1, 2, 3, 5, 7, 11, 13, 17];
        // for (var i = 0; i < inds.length; ++i) {
        //   var w = words[inds[i]];
        //   console.log(w, dict_.occurrence(w));
        // }
      },

      searchText: function(text) {
        if (!text)
          return [];

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
      }
    };
  };

  function onDiscovered(err, packs) {
    if (err) {
      console.error(err);
      return;
    }

    // all packages are discovered at this point
    core.PackManager.display();

    var lid = 'en';
    var abbr = 'tkjv';
    var pack = core.PackManager.getPackage(lid, abbr);
    if (pack === null) {
      console.warn('package [%s, %s] not found', lid, abbr);
      return;
    }

    var bible = core.Loader.loadBible(pack);
    var search = new BibleSearch();

    search.initialize(bible);
    var text = 'inn god earth';
    for (var i = 0; i < 200000; ++i)
      search.searchText(text);
    console.log(search.searchText(text));
  }

  var LCO = LC.instance();
  LCO.load('./data/lexical.json');
  core.PackManager.scan('./data/test/', true, onDiscovered);
}());



