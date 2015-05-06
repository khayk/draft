var _     = require('underscore');
var funcs = require('./functionality.js');

var Dictionary = funcs.Dictionary;


var algo = (function() {
  var cacheSize = 8;
  var cache = new Array(cacheSize);

  // increase cache size if neccessary
  function ensureCache(nsize) {
    if (cacheSize < nsize) {
      cacheSize *= 2;
      cacheSize = cacheSize < nsize ? nsize : cacheSize;
      cache = new Array(cacheSize);
      console.log('cache size increased to: %d', cacheSize);
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
    }
  };
})();



// helper function for search module
function resultLogger(desc, word, result) {
  //return;
  if (result !== null) {
    //console.log(desc + ' [%d]: %s -> %j', result.length, word, result);
    console.log(desc + ' [%d]: %s', result.length, word);
  }
  else
    console.log(desc + ' [0]: %s', word);
}


// function unify(arr) {
//   arr.sort();
//   return _.unique(arr);
// }


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

  console.log('merging %d results...', refs.length);
  var res = algo.combineSortedUniqueArrays(refs[0], refs[1]);
  for (var i = 2; i < refs.length; ++i) {
    res = algo.combineSortedUniqueArrays(res, refs[i]);
  }
  console.log('merge completed.');
  return res;
}


// function selectCondidates(word, dict) {
//   var tmp = dict.find(word);
//   var condidates = [];
//   if (tmp !== null)
//     condidates = tmp.concat(word);
//   return condidates;
// }


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

    getDictionary: function() {
      return dict_;
    },

    // show internal state of dicitonaries
    displayStatistics: function() {
      console.log('CS    words: %d', dict_.count());
      console.log('CI    words: %d', cim_.count());
      console.log('SUB   words: %d', swm_.count());
      console.log('CISUB words: %d', ciswm_.count());

      var stat = dict_.stat(false, 100);
      console.log('MAIN total count: ', stat.total);
      //console.log('MAIN index: ', stat.index, '\n');

      stat = cim_.stat(false, 100);
      console.log('CIM total count: ', stat.total);
      //console.log('CIM index: ', stat.index, '\n');

      stat = swm_.stat(false, 100);
      console.log('SWM total count: ', stat.total);
      //console.log('SWM index: ', stat.index, '\n');

      stat = ciswm_.stat(false, 100);
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

exports.Search = Search;
