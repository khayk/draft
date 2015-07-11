var colors = require('colors');
var util   = require('util');
var _      = require('lodash');
var lb     = require('./bible.js');
var log    = require('log4js').getLogger('srch');

var Lexical      = lb.Lexical;
var MC           = lb.MC;
var BBM          = lb.BBM;
var TextRenderer = lb.TextRenderer;


(function() {
  'use strict';

  var algo = (function() {
    var cacheSize = 8;
    var cache = new Array(cacheSize);

    // increase cache size if necessary
    function ensureCache(nsize) {
      if (cacheSize < nsize) {
        cacheSize *= 2;
        cacheSize = cacheSize < nsize ? nsize : cacheSize;
        cache     = new Array(cacheSize);
        log.info('cache size increased to: %d', cacheSize);
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
        var big = a,
          small = b,
          si = 0,
          bi = 0,
          nv, ov = '',
          sz = 0;
        if (a.length < b.length) {
          big = b;
          small = a;
        }

        // start copying into cache
        while (si < small.length && bi < big.length) {
          nv = small[si];
          if (nv < big[bi]) {
            si++;
          } else {
            nv = big[bi];
            bi++;
          }

          if (ov != nv) {
            cache[sz++] = nv;
            ov = nv;
          }
        }

        // select the remaining array
        var arr = small,
          idx = si;
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
        var i = 0,
          j = 0,
          sz = 0,
          c;
        if (a.length < b.length) {
          smin = a.length;
        }
        ensureCache(smin);

        while (i < a.length && j < b.length) {
          c = a[i];
          if (c < b[j]) {
            i++;
          } else if (c > b[j]) {
            j++;
          } else {
            cache[sz++] = c;
            i++;
            j++;
          }
        }

        return cache.slice(0, sz);
      }
    };
  })();


  /*------------------------------------------------------------------------*/


  // Keep track of all occurrences (refs) of the given key
  // @param {string} desc  optional description of the dictionary
  function Dictionary(desc) {
    var desc_      = desc;   // optional description of the dictionary
    var optimized_ = false;
    var changed_   = false;
    var index_     = {};
    var numWords_  = 0;

    // Add the word into dictionary, and holds all occurrences of the word
    // into a single array
    //
    // @param {string} word  word to add into dictionary, case sensitive
    // @param {string} ref   object that will be included in the array of given
    //                       word occurrences when it was queried
    //
    this.add = function(word, ref) {
      var o = index_[word];
      if (_.isUndefined(o)) {
        o = {c: 0, refs: []};
        index_[word] = o;
      }
      o.refs.push(ref);
      o.c++;
      optimized_ = false;
      changed_   = true;
    };

    // @brief  Optimizes dictionary, i.e. remove any duplicate references from
    //         the array of each key and sort them
    this.optimize = function() {
      if (optimized_)
        return;

      _.each(index_, function(value, key) {
        // we need to sort refs and make them unique
        var o = value.refs;

        // arrays with length 1 stay intact
        if (o.length > 1) {
          value.refs.sort();
          value.refs = _.unique(value.refs, true);
        }
      });

      numWords_  = Object.keys(index_).length;
      changed_   = false;
      optimized_ = true;
    };

    // @param {string} word  Word that is going to be looked for
    // @return   Array containing all unique references of the given word,
    //           lookup is case sensitive
    this.find = function(word) {
      if (!optimized_)
        throw 'Dictionary is not optimized. Call optimize!!!';
      var o = index_[word];
      if (_.isUndefined(o))
        return null;
      return o.refs;
    };

    // @returns  Array of all words
    this.words = function() {
      if (!optimized_)
        throw 'Dictionary is not optimized. Call optimize!!!';
      return Object.keys(index_);
    };

    // @param {string} word  Word that is going to be looked for
    // @returns  Number showing how many times word was added into dictionary
    //           -1 if word absent
    this.occurrence = function(word) {
      var o = index_[word];
      if (_.isUndefined(o))
        return -1;
      return o.c;
    };


    // @brief  Cleanup all internal data of dictionary
    this.clear = function() {
      optimized_ = false;
      changed_   = false;
      index_     = {};
      numWords_  = 0;
    };

    // @returns  Number of unique words
    this.count = function() {
      if (!optimized_)
        return Object.keys(index_).length;
      return numWords_;
    };

    // @brief  Verifies that the internal state of the dictionary is correct
    //         throws an exception if correction condition is not met
    this.verify = function() {
      _.each(index_, function(value, key) {
        var o = value.refs;
        for (var i = o.length - 1; i > 0; i--) {
          if (o[i] < o[i - 1]) {
            throw 'Verification failed for dictionary: ' + desc_;
          }
        }
      });
    };


    // Create an object containing brief summary of the dictionary content
    //
    // @param  {number} top        number of entires to insert into output
    // @return {object}            object containing details about dictionary
    // {
    //   unique: 'number of unique words in the dictionary'
    //   total: 'number showing how many times the word is met in the dictionary',
    //   freq: 'object of <word, number of occurrences of the word> elements',
    //   index: 'object of <word, array of unique references of the word>',
    //   str: 'preformatted string, that can be used for pretty output'
    // }
    //
    this.stat = function(top) {
      // calculate and return statistics for a dictionary
      var freqIndex = {};
      var totalWords = 0;
      _.each(index_, function(value, key) {
        var o = value.c;
        if (_.isUndefined(freqIndex[o]))
          freqIndex[o] = [];
        freqIndex[o].push(key);
        totalWords += o;
      });

      var fk = Object.keys(freqIndex);
      top = top || 10;

      // construct string containing top `top` words
      var str = '';
      for (var i = fk.length - 1; i >= 0 && top > 0; i--, top--) {
        var t = fk[i];
        str += util.format('%s : %j\n', _.padRight(t, 6, ' '), freqIndex[t]);
      }
      var that = this;
      return {
        unique: that.count(),
        total: totalWords,
        freq: freqIndex,
        index: index_,
        str: str
      };
    };
  }


  /*------------------------------------------------------------------------*/


  // helper function for search module
  function resultLogger(desc, word, result) {
    // if (result !== null) {
    //   log.info(desc + ' [%d]: %s', result.length, word);
    // } else {
    //   log.info(desc + ' [0]: %s', word);
    // }
  }



  // search each word from array `arr` inside the dictionary
  // `dict` and combine result into single array
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

    var res = algo.combineSortedUniqueArrays(refs[0], refs[1]);
    for (var i = 2; i < refs.length; ++i) {
      res = algo.combineSortedUniqueArrays(res, refs[i]);
    }
    return res;
  }


  /*------------------------------------------------------------------------*/


  // Search functionality
  var Search = function() {

    // key: original word from bible,
    // ref: array of references to bible verses
    var dict_  = new Dictionary('original words');

    // here we keep only those keys from dict_ where lowercase(key) != key
    // key: lowercase word from key of `dict_`
    // ref: array of words containing in dict as keys
    var cim_   = new Dictionary('lowercase words');

    // key: sub word of each unique word presented in `dict_`
    // ref: array of words from `dict_` keys
    var swm_   = new Dictionary('partial words');

    // the same usage as the `swm_` with the difference that all keys are
    // lowercase
    var ciswm_ = new Dictionary('lowercase partial words');

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

    // perform case sensitive match only
    function queryCS(word) {
      condidates = swm_.find(word);

      // word found in the main map
      if (dict_.occurrence(word) !== -1) {
        if (condidates !== null)
          condidates = algo.combineSortedUniqueArrays(condidates, [word]);
        else
          condidates = [word];
      }

      // now candidates contains all possible words that we
      // should lookup in the main dictionary and merge results
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

      // perform super-fast merging
      condidates = algo.combineSortedUniqueArrays(wordsGroup1, wordsGroup2);

      // sort all candidates by increasing order of word occurrence
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
      // during search `ref` will be returned
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


      // show internal state of dictionaries
      getStatistics: function() {
        return {
          'cs'   : dict_.stat(),
          'ci'   : cim_.stat(),
          'sub'  : swm_.stat(),
          'cisub': ciswm_.stat()
        };
      },

      // search specified word and return array of references
      // if succeeded, otherwise returns null
      // {cs: bool, ww: bool}
      // cs -> case sensitive
      // ww -> whole word
      query: function(word, opts) {

        if (!_.isString(word))
          throw new TypeError('Bad arguments');

        if (!opts) {
          opts = {
            cs: true,
            ww: true
          };
        } else if (!_.isObject(opts)) {
          throw new TypeError('Bad arguments');
        } else {
          if (typeof opts.cs !== 'boolean')
            opts.cs = true;
          if (typeof opts.ww !== 'boolean')
            opts.ww = true;
        }

        var caseSensitive = opts.cs;
        var wholeWord = opts.ww;

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


  /*------------------------------------------------------------------------*/


  var BibleSearch = function(bible) {
    var bible_    = null;
    var lexic_    = null;
    var search_   = null;
    var renderer_ = null;

    initialize(bible);

    // initialize bible search module
    function initialize(bible) {
      bible_ = bible;

      var tmp = MC.instance().getMeta(bible_.lang);
      if (tmp === null)
        throw 'Bible language is not specified or supported: ' + bible_.lang;

      lexic_    = tmp.lex;
      search_   = new Search();
      renderer_ = new TextRenderer();

      var toc   = bible_.getToc();
      var ti    = toc.first();

      while (ti !== null) {
        var book = bible_.getBook(ti.id);
        if (book !== null) {
          var chap = book.getChapter(1);
          while (chap !== null) {
            var verse = chap.getVerse(1);
            while (verse !== null) {
              var text = verse.render(renderer_);
              var ref = lb.encodeRef(verse.ref());
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
        ti = toc.next(ti.id);
      }

      // building index
      search_.buildIndex();
    }

    var OP_AND = 'and';

    return {
      // search words in a text according to rules in opts object
      // and return array of references if succeeded,
      // otherwise returns null
      // @param text
      // @param opts
      query: function(text, opts) {
        var res = {
          words: [],
          refs: [],
          orig: text,
          'opts': opts
        };
        var words = text.split(' ');
        words.sort();
        words = _.unique(words, true);

        if (!opts) {
          opts = {
            op: OP_AND
          };
        } else {
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
          } else if (op === OP_AND)
            stopLookup = true;
        });


        if (stopLookup) {
          // result is definitely empty
          return res;
        }

        // isolated result of query contained in the `refs` array
        // now we have to form a final result based on `op` value
        // this cases checked one by one only for the sake of optimization
        if (refs.length === 1) {
          res.refs = refs[0];
        } else if (refs.length >= 2) {
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

      // return search object
      search: function() {
        return search_;
      },

      bible: function() {
        return bible_;
      }
    };
  };


  exports.algo        = algo;
  exports.Dictionary  = Dictionary;
  exports.Search      = Search;
  exports.BibleSearch = BibleSearch;

}.call(this));

require('../config').logFileLoading(__filename);
