var util   = require('util');
var colors = require('colors/safe');
var _      = require('underscore');
var funcs  = require('./functionality.js');
var bibl   = require('./bible.js');
var common = require('./common.js');


var TextRenderer = bibl.TextRenderer;
var BBM          = bibl.BBM;
var Dictionary   = funcs.Dictionary;
var LC           = funcs.LC;



var algo = (function() {
  var cacheSize = 8;
  var cache = new Array(cacheSize);

  // increase cache size if neccessary
  function ensureCache(nsize) {
    if (cacheSize < nsize) {
      cacheSize *= 2;
      cacheSize = cacheSize < nsize ? nsize : cacheSize;
      cache = new Array(cacheSize);
      //console.log('cache size increased to: %d', cacheSize);
    }
  }

  return {
    // combine 2 sorted unique arrays into one sorted unique array
    combineSortedUniqueArrays: function(a, b) {
      if (a.length === 0)
        return b.slice();
      else if (b.length === 0)
        return a.slice();

      var smax = a.length + b.length;
      ensureCache(smax);
      var big = a, small = b, si = 0, bi = 0, nv, ov = '', sz = 0;
      if (a.length < b.length) {
        big   = b;
        small = a;
      }

      // start copying into cache
      while (si < small.length && bi < big.length) {
        nv = small[si];
        if (nv < big[bi]) {
          si++;
        }
        else {
          nv = big[bi];
          bi++;
        }

        if (ov != nv) {
          cache[sz++] = nv;
          ov = nv;
        }
      }

      // select the remaining array
      var arr = small, idx = si;
      // change selection if it was wrong
      if (small.length === si) {
        arr = big;
        idx = bi;
      }

      // copy the tails
      for (var j = idx; j < arr.length; ++j) {
        nv = arr[j];
        if (ov != nv) {
          cache[sz++] = nv;
        }
      }
      return cache.slice(0, sz);
    },

    // intersect 2 sorted unique arrays into one sorted unique array
    intersectSortedUniqueArrays: function(a, b) {
      if (a.length === 0 || b.length === 0)
        return [];

      var smin = b.length;
      var i = 0, j = 0, sz = 0, c;
      if (a.length < b.length) {
        smin  = a.length;
      }
      ensureCache(smin);

      while (i < a.length && j < b.length) {
        c = a[i];
        if (c < b[j]) {
          i++;
        }
        else if (c > b[j]) {
          j++;
        }
        else {
          cache[sz++] = c;
          i++;
          j++;
        }
      }

      return cache.slice(0, sz);
    }
  };
})();



// helper function for search module
function resultLogger(desc, word, result) {
  return;
  if (result !== null) {
    //console.log(desc + ' [%d]: %s -> %j', result.length, word, result);
    console.log(desc + ' [%d]: %s', result.length, word);
  }
  else
    console.log(desc + ' [0]: %s', word);
}



// search each word from array `arr` inside the dictionary
// `dict` and combine resulted into single array
// that is sorted and contains unique elements
function runQuery(arr, dict) {
  if (arr === null)
    return null;

  var refs = [];
  arr.forEach(function(w) {
    var tmp = dict.find(w);
    if (tmp !== null)
      refs.push(tmp);
  });

  if (refs.length === 0)
    return null;
  if (refs.length === 1)
    return refs[0];

  //console.log('merging %d results...', refs.length);
  var res = algo.combineSortedUniqueArrays(refs[0], refs[1]);
  for (var i = 2; i < refs.length; ++i) {
    res = algo.combineSortedUniqueArrays(res, refs[i]);
  }
  //console.log('merge completed.');
  return res;
}


// ------------------------------------------------------------------------
//                      CORE SEARCH FUNCTIONALITY
// ------------------------------------------------------------------------

// Search functionality
var Search = function() {
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

  // the same usage as the `swm_` with the differenct that all keys are
  // lowercase
  var ciswm_   = new Dictionary('lowercase partial words');

  // some temporary variables
  var result, condidates;

  function updateSubWordDict(word, ref, dict) {
    var len = word.length - 1;
    while (len > 2) {
      var wp = word.substr(0, len);
      dict.add(wp, ref);
      --len;
    }
  }

  function updateCaseInsensitiveDict(word) {
    var ciWord = word.toLowerCase();
    cim_.add(ciWord, word);
    updateSubWordDict(ciWord, word, ciswm_);
  }

  // performs case sensitive and whole word searching
  function queryCS_WW(word) {
    result = dict_.find(word);
    resultLogger('CS && WW', word, result);
    return result;
  }

  // peroform case sensitive match only
  function queryCS(word) {
    condidates = swm_.find(word);

    // word found in the main map
    if (dict_.occurrence(word) !== -1) {
      if (condidates !== null)
        condidates = algo.combineSortedUniqueArrays(condidates, [word]);
      else
        condidates = [word];
    }

    // now condidates contains all possible words that we
    // should lookup in the main dicitonary and merge results
    result = runQuery(condidates, dict_);
    resultLogger('CS', word, result);
    return result;
  }

  // perform whole word search, cases insensitive match
  function queryWW(ciWord, word) {
    condidates = cim_.find(ciWord);

    result = runQuery(condidates, dict_);
    resultLogger('WW', word, result);
    return result;
  }

  // perform search of the word, case insensitive and any part of the word
  function queryAll(ciWord, word) {
    var wordsGroup1 = ciswm_.find(ciWord);
    var wordsGroup2 = cim_.find(ciWord);
    if (wordsGroup1 === null) wordsGroup1 = [];
    if (wordsGroup2 === null) wordsGroup2 = [];

    // peform superfast merging
    condidates = algo.combineSortedUniqueArrays(wordsGroup1, wordsGroup2);

    // sort all condidates by increasing order of word occurrence
    if (condidates !== null && condidates.length > 2) {
      condidates.sort(function(a, b) {
        return cim_.occurrence(a) - cim_.occurrence(b);
      });
    }

    result = runQuery(condidates, dict_);
    resultLogger('', word, result);
    return result;
  }

  return {
    // add specified `word` into dictionary
    // during search `ref` should be returned
    add: function(word, ref) {
      word = word.trim();

      // ignore empty strings
      if (word.length === 0)
        return;

      dict_.add(word, ref);
      updateSubWordDict(word, word, swm_);
      updateCaseInsensitiveDict(word);
    },


    // build index should be call if words addition is completed
    buildIndex: function() {
      dict_.optimize();
      dict_.verify();

      cim_.optimize();
      cim_.verify();

      swm_.optimize();
      swm_.verify();

      ciswm_.optimize();
      ciswm_.verify();
    },


    // get main dictionary, here we store all cases sensitive
    // unique words. i.e. no duplicate are presented
    getDictionary: function() {
      return dict_;
    },


    // show internal state of dicitonaries
    displayStatistics: function() {
      console.log('CS    words: %d', dict_.count());
      console.log('CI    words: %d', cim_.count());
      console.log('SUB   words: %d', swm_.count());
      console.log('CISUB words: %d', ciswm_.count());

      var stat = dict_.stat(true, 10);
      console.log('MAIN total count: ', stat.total);
      //console.log('MAIN index: ', stat.index, '\n');

      stat = cim_.stat(false, 10);
      console.log('CIM total count: ', stat.total);
      //console.log('CIM index: ', stat.index, '\n');

      stat = swm_.stat(false, 10);
      console.log('SWM total count: ', stat.total);
      //console.log('SWM index: ', stat.index, '\n');

      stat = ciswm_.stat(false, 10);
      console.log('CISWM total count: ', stat.total);
      //console.log('CISWM index: ', stat.index, '\n');
    },


    // search specifed word and return array of references
    // if succeeded, otherwise returns null
    // {cs: bool, ww: bool}
    // cs -> case sensitive
    // ww -> whole word
    query: function(word, opts) {

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

      var caseSensitive = opts.cs;
      var wholeWord     = opts.ww;

      if (caseSensitive) {
        if (wholeWord)
          return queryCS_WW(word);
        else
          return queryCS(word);
      }

      // requested case insensitive words
      var ciWord = word.toLowerCase();
      if (wholeWord)
        return queryWW(ciWord, word);
      return queryAll(ciWord, word);
    }
  };
};




// ------------------------------------------------------------------------
//                             BIBLE SEARCH
// ------------------------------------------------------------------------
var BibleSearch = function(bible) {
  var bible_    = null;
  var lexic_    = null;
  var search_   = null;
  var renderer_ = null;

  initialize(bible);

  // create regex object
  function createRegex(word, lang, cs, ww) {
    var flags = 'gmi';
    if (cs === true) {
      flags = 'gm';
    }

    var letters = lexic_.getLetters();
    var str;
    if (ww === true)
      str = '([^%letters%]|^)%word%(?=([^%letters%]|$))';
    else
      str = '([^%letters%]|^)%word%';
    str = str.replace(/%letters%/gm, letters);
    str = str.replace(/%word%/gm, word);

    return new RegExp(str, flags);
  }

  // colorize the `part` in the 'res'
  function colorize(res, part, lang, cs, ww) {
    var re = createRegex(part, lang, cs, ww);
    var arr = re.exec(res);

    if (arr === null)
      return res;

    var str = '';
    var prevIndex = 0;
    var prevMatchLength = 0;
    var match = '';
    while (arr !== null) {
      match = arr[0];
      if (str.length === 0)
        str += res.substring(0, arr.index);
      else
        str += res.substring(prevIndex + prevMatchLength, arr.index);
      str += colors.green(match);
      prevIndex = arr.index;
      prevMatchLength = match.length;
      arr = re.exec(res);
      if (arr === null) {
        str += res.substr(prevIndex + prevMatchLength);
      }
    }
    return str;
  }

  // initialize bible search module
  function initialize(bible) {
    bible_ = bible;
    lexic_ = LC.instance().getLexical(bible_.lang);

    if (lexic_ === null)
      throw 'Bible language is not specified or supported: ' + bible_.lang;

    search_   = new Search();
    renderer_ = new TextRenderer();

    var toc = bible_.getToc();
    var ti = toc.firstItem();

    while (ti !== null) {
      var book = bible_.getBook(ti.id);
      if (book !== null) {
        var chap = book.getChapter(1);
        while (chap !== null) {
          var verse = chap.getVerse(1);
          while (verse !== null) {
            var text = verse.render(renderer_);
            var ref = bibl.encodeRef(verse.ref());
            text = lexic_.removePunctuations(text);

            // process every single word
            var wordsArray = text.split(' ');
            for (var i = 0; i < wordsArray.length; ++i)
              search_.add(wordsArray[i], ref);
            verse = verse.next();
          }
          chap = chap.next();
        }
      }
      ti = toc.nextItem(ti.id);
    }

    // building index
    search_.buildIndex();
  }

  var OP_AND = 'and';

  return {
    // search words in a text occording to rules in opts object
    // and return array of references if succeeded,
    // otherwise returns null
    // @param text
    // @param opts
    query: function(text, opts) {
      var res = {words: [], refs: [], orig: text, 'opts': opts};
      var words = text.split(' ');
      words.sort();
      words = _.unique(words, true);

      if (!opts) {
        opts = {op: OP_AND};
      }
      else {
        if (typeof opts.op !== 'string')
          opts.op = OP_AND;
      }
      var op = opts.op;

      // stop perform any further searches if overall result is surely empty
      var stopLookup = false;

      var refs = [];
      words.forEach(function(word) {
        if (stopLookup)
          return;

        var w = lexic_.removePunctuations(word);
        var r = search_.query(w, opts);

        if (r !== null) {
          refs.push(r);
          res.words.push(word); // original words with punctuations
        }
        else if (op === OP_AND)
          stopLookup = true;
      });


      if (stopLookup) {
        // result is defenitly empty
        return res;
      }

      // isolated result of query conrained in the `refs` array
      // now we have to form a final result based on `op` value
      // this cases checked one by one ony for the sake of optimization
      if (refs.length === 1) {
        res.refs = refs[0];
      }
      else if (refs.length >= 2) {
        if (op === OP_AND)
          res.refs = algo.intersectSortedUniqueArrays(refs[0], refs[1]);
        else
          res.refs = algo.combineSortedUniqueArrays(refs[0], refs[1]);

        for (var i = 2; i < refs.length; ++i) {
          if (op === OP_AND)
            res.refs = algo.intersectSortedUniqueArrays(res.refs, refs[i]);
          else
            res.refs = algo.combineSortedUniqueArrays(res.refs, refs[i]);
        }
      }
      return res;
    },


    // display the result in a use readable format
    // @param result   return value of query
    expend: function(result) {
      var count = result.refs.length;
      var summary = util.format('%d results for `%s`', count, result.orig);
      console.log(summary);
      console.log(colors.red(summary));

      if (count >= 80)
        return;

      result.refs.forEach(function(ref) {

        var dref = bibl.decodeRef(ref);
        var book = bible_.getBook(BBM.instance().idByOn(dref.ix));
        var chap = book ? book.getChapter(dref.cn) : null;
        var verse = chap ? chap.getVerse(dref.vn) : null;
        if (verse) {
          var res = renderer_.renderVerse(verse);
          result.words.forEach(function(w) {
            res = colorize(res, w, bible_.lang, result.opts.cs, result.opts.ww);
          });

          console.log('%s.  %s', common.padString(verse.id(), '           ', true), res);
        }
      });
    },

    // return search object
    search: function() {
      return search_;
    },

    // temporary function
    searchAllWords: function() {
      var maxLength = 0;
      var resWord;
      search_.getDictionary().words().forEach(function(w) {
        var res = search_.query(w);
        if (maxLength < res.length) {
          maxLength = res.length;
          resWord = w;
        }
      });

      console.log("Max lenght: %d, word: %s", maxLength, resWord);
    }
  };
};


exports.Search      = Search;
exports.BibleSearch = BibleSearch;
exports.algo        = algo;