var colors         = require('colors');
var argv           = require('minimist')(process.argv.slice(2));
var fs             = require('fs');
var path           = require('path');
var util           = require('util');
var _              = require('underscore');

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

  function dumpStats(index, file, top) {
    var statistics = {};
    var freqIndex = {};
    var totalWords = 0;

    _.each(index, function(value, key) {
      var o = value.c;
      if (_.isUndefined(freqIndex[o]))
        freqIndex[o] = [];
      freqIndex[o].push(key);
      totalWords += o;

      console.log('%s -> %j', key, value);
    });

    // var fk = Object.keys(freqIndex);

    // var wstream = fs.createWriteStream(file);
    // top = top || 10;
    // // print top `top` words
    // for (var i = fk.length - 1; i >= 0 && top > 0; i--, top--) {
    //   var t = fk[i];
    //   wstream.write(util.format('%s : %j',
    //                 common.padWithSymbol(t, 6, ' '),
    //                 freqIndex[t]) + '\r\n');
    // }
    // wstream.end();
  }

// ------------------------------------------------------------------------
//                             BIBLE SEARCH
// ------------------------------------------------------------------------
var BibleSearch = function() {
  var bible_   = null;
  var lexic_   = null;
  var renderer = null;

  // key: original word from bible,
  // ref: array of references to bible verses
  var dict_    = new Dictionary('original words');

  // here we keep only those keys from dict_ where lowercase(key) != key
  // key: lowercase word from key of `dict_`
  // ref: array of words containing in dict as keys
  var cim_     = new Dictionary('lowercase words');

  // key: sub word of each unique word presented in `dict_`
  // ref: array of words from `dict_` keys
  var swm_     = new Dictionary('partial words');


  function updateSubWordDict(word, ref) {
    //return;
    var len = word.length - 1;
    while (len > 2) {
      var wp = word.substr(0, len);
      swm_.add(wp, ref);
      --len;
    }
  }

  function updateCaseInsensitiveDict(word) {
    var ciWord = word.toLowerCase();

    // skip adding word, if there are no differences between
    // case sensitive and insensitive versions
    if (ciWord !== word) {
      cim_.add(ciWord, word);
      updateSubWordDict(ciWord, word);
    }
  }


  function updateMainDict(word, ref) {
    word = word.trim();

    // ignore empty strings
    if (word.length === 0)
      return;

    dict_.add(word, ref);
    updateSubWordDict(word, word);
    updateCaseInsensitiveDict(word);
  }


  function initializeDictionaries() {
    var toc = bible_.getToc();
    var ti = toc.firstItem();

    while (ti !== null) {
      var book = bible_.getBook(ti.id);
      if (book !== null) {
        var chap = book.getChapter(1);
        while (chap !== null) {
          var verse = chap.getVerse(1);
          while (verse !== null) {
            var text = verse.render(renderer);
            var ref = encodeRef(verse.ref());
            text = lexic_.removePunctuations(text);

            // process every single word
            text.split(' ').forEach(function (word) {
              updateMainDict(word, ref);
            });
            verse = verse.next();
          }
          chap = chap.next();
        }
      }
      ti = toc.nextItem(ti.id);
    }

    dict_.optimize();
    dict_.verify();

    cim_.optimize();
    cim_.verify();

    swm_.optimize();
    swm_.verify();
  }

  function resultLogger(desc, word, result) {
    if (result !== null)
      console.log(desc + ' [%d]: %s -> %j', result.length, word, result);
    else
      console.log(desc + ': NO RESULT `%s`', word);
    console.log('');
  }

  function unify(arr) {
    arr = arr.sort();
    arr = _.unique(arr);
    return arr;
  }

  function runQuery(arr, dict) {
    if (_.isArray(arr) ) {
      //console.log('combine array: ', arr);

      var result = [];
      arr.forEach(function(w) {
        var tmp = dict.find(w);
        if (tmp !== null)
          result = result.concat(tmp);
      });

      return unify(result);
    }
    else
      throw 'wrong usage';
  }

  function selectCondidates(word, dict) {
    var tmp = dict.find(word);
    var condidates = [];
    if (tmp !== null)
      condidates = tmp.concat(word);
    return condidates;
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

      initializeDictionaries();

      console.log('CS words: %d', dict_.count());
      console.log('CI words: %d', cim_.count());
      console.log('SUB words: %d', swm_.count());

      var stat = dict_.stat(false, 100);
      console.log('MAIN total count: ', stat.total);
      console.log('MAIN index: ', stat.index, '\n');

      stat = cim_.stat(false, 100);
      console.log('CIM total count: ', stat.total);
      console.log('CIM index: ', stat.index, '\n');

      stat = swm_.stat(false, 100);
      console.log('SWM total count: ', stat.total);
      console.log('SWM index: ', stat.index, '\n');

      // console.log('SWM index: ',
      //             util.inspect(stat.index, false, 2, true),
      //             '\n');
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
      var result, condidates;

      if (caseSensitive) {
        if (wholeWord) {
          result = dict_.find(word);
          resultLogger('CS && WW', word, result);
          return result;
        }
        else {
          condidates = selectCondidates(word, swm_);
          condidates.push(word);
          unify(condidates);

          //console.log('condidates: ', condidates);

          // now condidates contains all possible words that we
          // should lookup in the main dicitonary and merge results
          result = runQuery(condidates, dict_);
          resultLogger('CS', word, result);
          return result;
        }
      }

      // requested case insensitive words
      var ciWord = word.toLowerCase();
      if (wholeWord) {
        condidates = selectCondidates(ciWord, cim_);
        console.log(condidates);
        //condidates.push(word);
        unify(condidates);

        result = runQuery(condidates, dict_);
        resultLogger('WW', word, result);
        return result;
      }
      else {

        var allPossibleWords = swm_.find(ciWord);
        result = [];
        allPossibleWords.forEach(function(subword) {
          if (result === null)
            return;

          var csWords = cim_.find(ciWord);
          var tmp = this.getResultsHelper(csWords, dict_);
          if (tmp !== null) {
            result.concat(tmp);
          }
          else {
            result = null;
          }
        });

        result.sort();
        result = _.unique(result);
        console.log('%s -> %j', ciWord, result);
      }
      return result;
    },

    getResultsHelper: function(words) {
      if (words === null)
        return null;

      var result = [];
      words.forEach(function(w) {
        var tmp = dict_.find(w);
        if (tmp !== null) {
          result = _.union(result, tmp);
        }
      });
      result.sort();
      result = _.unique(result, true);
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

  //   var result = search.searchWord(word, opts);
  //   //console.log(result);
  //   search.expend(word, result);
  // }

  console.log(argv);
  var LCO = LC.instance();
  LCO.load('./data/lexical.json');
  //core.PackManager.scan('./data/test/', true, onDiscovered);

  timer.start();
  var bible = createTestBible();
  //var bible = loadUSFMBible(dropboxDir + '/' + 'Data/zed/');
  bible.lang = 'en';
  var search = new BibleSearch();

  timer.stop();
  timer.report();

  for (var i = 0; i < 1; ++i) {
    timer.start();
    search.initialize(bible);
    timer.stop();
    timer.report();
  }


  var word = argv.word;
  var opts = {};
  if (argv.cs === 'false') {
    opts.cs = false;
  }
  if (argv.ww === 'false')
    opts.ww = false;

  // search.searchWord('SIMPLE', {cs: true,  ww: true});
  // search.searchWord('Simple', {cs: true,  ww: true});
  // search.searchWord('simple', {cs: true,  ww: true});

  // search.searchWord('SIMPLE', {cs: true,  ww: false});
  // search.searchWord('Simple', {cs: true,  ww: false});
  // search.searchWord('simple', {cs: true,  ww: false});

  search.searchWord('siMple', {cs: false,  ww: true});
  search.searchWord('Simple', {cs: false,  ww: true});
  search.searchWord('simple', {cs: false,  ww: true});


  // search.searchWord(word, {cs: true,  ww: false});
  // search.searchWord(word, {cs: false, ww: true});
  // search.searchWord(word, {cs: false, ww: false});
}());



