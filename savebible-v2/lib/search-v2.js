var colors = require('colors');
var util   = require('util');
var _      = require('lodash');
var lb     = require('./bible.js');
var rndrs  = require('./renderers.js');
var log    = require('log4js').getLogger('srch');

var Lexical      = lb.Lexical;
var MC           = lb.MC;
var BBM          = lb.BBM;
var TextRenderer = lb.TextRenderer;


(function() {
  'use strict';

  var reNav = /(\w+)(\s+?(\d+)(:(\d+))?)?/g;
           // /(\w+)(\s(\d+):(\d+))?/g;

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
      // predicate for sorting object by length in ascending order
      ascending: function(x, y) {
        if (x.length < y.length) {
          return -1;
        }
        if (x.length > y.length) {
          return 1;
        }
        return 0;
      },

      // predicate for sorting object by length in descending order
      descending: function(x, y) {
        if (x.length > y.length) {
          return -1;
        }
        if (x.length < y.length) {
          return 1;
        }
        return 0;
      },

      // sort array by length
      sortByLength: function(arrays, order) {
        if (_.isUndefined(order))
          order = this.ascending;
        arrays.sort(order);
      },

      // merge 2 sorted unique arrays into one sorted unique array
      union2Array: function(a, b) {
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
      intersect2Array: function(a, b) {
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
      },

      // merge multiple sorted unique arrays into one sorted unique array
      unionMultipleArrays: function(arrays) {
        if (arrays.length === 0)
          return [];
        if (arrays.length === 1)
          return arrays[0];

        algo.sortByLength(arrays);

        var res = this.union2Array(arrays[0], arrays[1]);
        for (var i = 2; i < arrays.length; ++i) {
          res = this.union2Array(res, arrays[i]);
        }
        return res;
      },

      // @return  reversed input string
      reverse: function(str) {
        for (var i = str.length - 1, o = ''; i >= 0; o += str[i--]) {}
        return o;
      }
    };
  })();


  /*------------------------------------------------------------------------*/


  // @brief  building block for dictionary, used to store a single letter
  //         of a word
  var Node = function(letter) {
    this.letter = letter;
    this.parent = null;
    this.childs = {};
    this.refs   = [];
    this.uwc    = 0;    // unique words count (including childs words)
    this.twc    = 0;    // total words count (including childs words)
  };

  // @brief  input node become a child for a current node
  Node.prototype.addNode = function(node) {
    var r = this.childs[node.letter];
    if (_.isUndefined(r)) {
      this.childs[node.letter] = node;
      node.parent = this;
    }
  };

  // @param  {string} letter a single character
  // @return {object}        child node that have specified letter, null if
  //                         no such child found
  Node.prototype.getNode = function(letter) {
    var r = this.childs[letter];
    if (_.isUndefined(r))
      return null;
    return r;
  };

  // @brief  Added ref object into references list of the current node
  // @param {string} ref  reference we are going to keep in the child node
  Node.prototype.addRef = function(ref) {
    var parent = null;
    if (this.refs.length === 0) {
      parent = this;
      while (parent !== null) {
        parent.uwc++;
        parent = parent.parent;
      }
    }

    this.refs.push(ref);

    parent = this;
    while (parent !== null) {
      parent.twc++;
      parent = parent.parent;
    }
  };

  // @return {array}  Array containing all references that previously inserted
  //                  into current node
  Node.prototype.getRefs = function() {
    return this.refs;
  };

  // @brief  Collect all references arrays for current node with all its
  //         children and sub-children
  // @param {array} arrays  Array object that should be used to store arrays
  //                        Inserted array is an array of refereneces.
  Node.prototype.getAllRefs = function(arrays) {
    if (this.refs.length > 0) {
      arrays.push(this.getRefs());
    }

    _.each(this.childs, function(node, key) {
      node.getAllRefs(arrays);
    });
  };

  // @return  Total number of words stored in the current node (i.e. it counts
  //          every action of word insertion, with duplicates)
  Node.prototype.addedWordsCount = function() {
    return this.twc;
  };

  // @return  Number of unique words stored in the current node
  Node.prototype.uniqueWordsCount = function() {
    return this.uwc;
  };

  // @brief  Collect all words stored in the current node. Keep result in
  //         the input object `words`
  //         key:   word
  //         value: {uwc: unique words count, twc: total words count}
  //
  Node.prototype.collectWords = function(words) {
    var refs = this.getRefs();
    if (refs.length !== 0) {
      var parent = this;
      var word = '';
      while (parent !== null) {
        word += parent.letter;
        parent = parent.parent;
      }
      word = algo.reverse(word);
      words[word] = {uwc: this.uwc, twc: this.twc};
    }

    _.each(this.childs, function(node, key) {
      node.collectWords(words);
    });
  };

  // @brief  Recursively scan all references of current node, sort ref array
  //         and unify (leave only unique references, remove duplicates)
  Node.prototype.optimize = function() {
    _.each(this.childs, function(value, key) {
      value.optimize();
    });

    if (this.refs.length > 1) {
      this.refs.sort();
      this.refs = _.unique(this.refs, true);
    }
  };

  // @brief  Verify that the result of optimization is reached
  Node.prototype.verify = function() {
    _.each(this.childs, function(value, key) {
      value.verify();
    });

    if (this.refs.length > 1) {
      var o = this.refs;
      for (var i = o.length - 1; i > 0; i--) {
        if (o[i] < o[i - 1]) {
          throw new Error('Verification failed');
        }
      }
    }
  };


  /*------------------------------------------------------------------------*/


  // Keep track of all occurrences (refs) of the given word
  // @param {string} desc  optional description of the dictionary
  function Dictionary(desc) {
    var desc_      = desc;   // optional description of the dictionary
    var optimized_ = false;
    var changed_   = false;
    var root_      = null;

    // Add the word into dictionary
    //
    // @param {string} word  word to add into dictionary, case sensitive
    // @param {string} ref   object that will be included in the array of
    //                       word occurrences when it was queried
    // @return this
    this.add = function(word, ref) {
      if (word.length === 0)
        return;

      var node = root_;
      for (var i = 0; i < word.length; i++) {
        var letter = word[i];
        var child = node.getNode(letter);
        if (child === null) {
          child = new Node(letter);
          node.addNode(child);
        }
        node = child;
      }
      node.addRef(ref);
      optimized_ = false;
      changed_   = true;
      return this;
    };

    // @brief  Optimizes dictionary, i.e. remove any duplicate references from
    //         the internal representation
    this.optimize = function() {
      if (optimized_ === true)
        return;

      root_.optimize();
      changed_   = false;
      optimized_ = true;
    };

    // @param {string} word  Word that is going to be searched
    // @return   Array containing all unique references of the given word,
    //           lookup is case sensitive
    this.find = function(word) {
      if (!optimized_)
        throw new Error('Dictionary is not optimized. Call optimize!!!');

      var node = this.findNode(word);
      if (node === null)
        return [];
      return node.getRefs();
    };

    // @param  {string}  word  Word that is going to be searched
    // @return {object}  node containing all unique references of the given
    //                   word, lookup is case sensitive
    this.findNode = function(word) {
      if (_.isUndefined(word))
        return null;

      var node = root_;
      for (var i = 0; i < word.length; i++) {
        var letter = word[i];
        var child = node.getNode(letter);
        if (child === null)
          return null;
        node = child;
      }
      return node;
    };

    // @returns  Array of all words
    this.words = function() {
      if (!optimized_)
        throw new Error('Dictionary is not optimized. Call optimize!!!');
      var node = root_;
      var words = {};
      node.collectWords(words);
      return Object.keys(words);
      //return words;
    };

    // @param {string} word  Word that is going to be searched
    // @returns  Number showing how many times word was added into the
    //                  dictionary
    //                  0 if word absent
    this.occurrence = function(word) {
      var node = this.findNode(word);
      if (node === null || _.isUndefined(word) || word.length === 0)
        return 0;
      return node.addedWordsCount();
    };


    // @brief  Cleanup all internal data of dictionary
    this.clear = function() {
      root_      = new Node('');
      desc_      = '';
      optimized_ = false;
      changed_   = false;
    };

    // @returns  Number of unique words
    this.count = function() {
      return root_.uniqueWordsCount();
    };

    // @brief  Verifies that the internal state of the dictionary is correct
    //         throws an exception if correction condition is not met
    this.verify = function() {
      try {
        root_.verify();
      }
      catch (e) {
        throw new Error('Verification failed for dictionary: ' + desc_);
      }
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
      var self = this;

      // calculate and return statistics for a dictionary
      var index = this.words();
      var freqIndex = {};
      var totalWords = 0;
      _.each(index, function(value, key) {
        var node = self.findNode(key);
        var o = node.addedWordsCount();
        if (_.isUndefined(freqIndex[o]))
          freqIndex[o] = [];
        freqIndex[o].push(key);
        totalWords += o;
      });

      var fk = Object.keys(freqIndex);
      fk.sort();
      top = top || 10;

      // construct string containing top `top` words
      var str = '';
      for (var i = fk.length - 1; i >= 0 && top > 0; i--, top--) {
        var t = fk[i];
        str += util.format('%s : %j\r\n', _.padRight(t, 6, ' '), freqIndex[t]);
      }

      return {
        unique: self.count(),
        total: self.occurrence(''),
        freq: freqIndex,
        index: index,
        str: str
      };
    };

    // clear will force of the initialization of the members above
    this.clear();
  }


  /*------------------------------------------------------------------------*/


  // Search functionality
  var Search = function() {
    // case sensitive word from the bible
    var cs_ = new Dictionary();

    // lowercase words from cs_ dictionary
    var ci_ = new Dictionary();

    // some temporary variables
    var result = [];
    var node   = null;

    // helper function for search module
    function resultLogger(desc, word, result) {
      log.info(desc + _.padRight(' [' + result.length + ']', 8, ' ') +  ': %s', word);
    }


    // performs case sensitive and whole word searching
    function queryCS_WW(word) {
      result = cs_.find(word);
      resultLogger('CS && WW', word, result);
      return result;
    }

    // perform case sensitive match only
    function queryCS(word) {
      node = cs_.findNode(word);
      if (node === null)
        return [];
      var arrays = [];
      //suaCollector.reset();
      node.getAllRefs(arrays);
      result = algo.unionMultipleArrays(arrays);//  suaCollector.combine();
      resultLogger('CS', word, result);
      return result;
    }

    // perform whole word search, cases insensitive match
    function queryWW(ciWord, word) {
      result = ci_.find(ciWord);
      resultLogger('WW', word, result);
      return result;
    }

    // perform search of the word, case insensitive and any part of the word
    function queryAll(ciWord, word) {
      node = ci_.findNode(ciWord);
      if (node === null)
        return [];
      var arrays = [];
      //suaCollector.reset();
      node.getAllRefs(arrays);
      result = algo.unionMultipleArrays(arrays);//  suaCollector.combine();
      //result = suaCollector.combine();
      resultLogger('..', word, result);
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
        cs_.add(word, ref);
        ci_.add(word.toLowerCase(), ref);
      },


      // build index should be call if words addition is completed
      build: function() {
        cs_.optimize();
        ci_.optimize();

        cs_.verify();
        ci_.verify();
      },


      // get main dictionary, here we store all cases sensitive
      // unique words. i.e. no duplicate are presented
      getDictionary: function() {
        return cs_;
      },


      // show internal state of dictionaries
      getStatistics: function() {
        return {
          'cs': cs_.stat(),
          'ci': ci_.stat()
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

        // enable whole word restriction for very short words
        if (wholeWord === false && word.length < 3) {
          wholeWord = true;
        }

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

    initialize(bible);

    // initialize bible search module
    function initialize(bible) {
      bible_ = bible;

      var tmp = MC.instance().getMeta(bible_.lang);
      if (tmp === null)
        throw new Error('Bible language is not specified or supported: ' + bible_.lang);

      lexic_   = tmp.lex;
      search_  = new Search();
      var rndr = new rndrs.TextRenderer();

      var verse;
      var vit = bible_.verseIterator();
      while ((verse = vit.next()) !== null) {
        var text = verse.render(rndr);
        var ref  = lb.encodeRef(verse.ref());
        text     = lexic_.removePunctuations(text);

        // process every single word
        var wordsArray = text.split(' ');
        for (var i = 0; i < wordsArray.length; ++i)
          search_.add(wordsArray[i], ref);
      }

      // building index
      search_.build();
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
          opts: opts
        };
        var words = text.split(' ');
        //words.sort();
        algo.sortByLength(words, algo.descending);
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

          if (r.length > 0) {
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
            res.refs = algo.intersect2Array(refs[0], refs[1]);
          else
            res.refs = algo.union2Array(refs[0], refs[1]);

          for (var i = 2; i < refs.length; ++i) {
            if (op === OP_AND)
              res.refs = algo.intersect2Array(res.refs, refs[i]);
            else
              res.refs = algo.union2Array(res.refs, refs[i]);
          }
        }
        return res;
      },

      // @param query {string}  query in format 'BookID ChapterNum:VerseNum'
      //
      // @returns reference on single verse based on query, or null for
      //          invalid query
      nav: function(query) {
        reNav.lastIndex = 0;
        var arr = reNav.exec(query.toUpperCase());
        if (arr === null)
          return null;

        var id = arr[1], cn = 1, vn = 1;
        if (!_.isUndefined(arr[3]) && arr[3].length > 0)
          cn = parseInt(arr[3]);
        if (!_.isUndefined(arr[5]) && arr[5].length > 0)
          vn = parseInt(arr[5]);

        var book = bible_.getBook(id);
        if (book === null)
          return null;

        var chap = book.getChapter(cn);
        if (chap === null)
          return null;
        return chap.getVerse(vn);
      },

      // @returns  search object
      search: function() {
        return search_;
      },

      // @returns  bible object instance occosiated with BibleSearch
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
