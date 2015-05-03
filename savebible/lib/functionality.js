var fs  = require('fs');
var _   = require('underscore');
var cmn = require('./common.js');

// ------------------------------------------------------------------------
//                             DICTIONARY
// ------------------------------------------------------------------------
function Dictionary(desc) {
  // optional description of the dictionary
  var desc_      = desc;
  var optimized_ = false;
  var changed_   = false;
  var index_     = {};
  var numWords_  = 0;

  // words are case sensitive
  this.add = function(word, ref) {
    if (_.isUndefined(index_[word]))
      index_[word] = {c: 0, refs: []};
    index_[word].refs.push(ref);
    index_[word].c++;
    optimized_ = false;
    changed_   = true;
  };

  // optimize dictionary
  this.optimize = function() {
    if (_.isUndefined(index_))
      return null;

    _.each(index_, function(value, key) {
      // we need to sort refs and make them unique
      var o = value.refs;
      var n = {}, r = [];
      for (var i = 0; i < o.length; i++) {
        if (typeof n[o[i]] === 'undefined') {
          n[o[i]] = true;
          r.push(o[i]);
        }
      }

      // r is now unique
      value.refs = r;
      value.refs.sort();
    });

    numWords_  = Object.keys(index_).length;
    changed_   = false;
    optimized_ = true;
  };

  // word lookup is case sensitive
  this.find = function(word) {
    if (!optimized_)
      throw 'Dictionary is not optimized. Call optimize!!!';
    var r = index_[word];
    if (_.isUndefined(r))
      return null;
    return r.refs;
  };

  // returns array of all words
  this.words = function() {
    if (!optimized_)
      throw 'Dictionary is not optimized. Call optimize!!!';
    return Object.keys(index_);
  };

  // returns how many times the word met in the dictionary
  // -1 if word absent
  this.occurrence = function(word) {
    var r = index_[word];
    if (_.isUndefined(r))
      return -1;
    return r.c;
  };

  // cleanup all internal data of dictionary
  this.clear = function() {
    optimized_ = false;
    changed_   = false;
    index_     = {};
    numWords_  = 0;
  };

  // returns number of words
  this.count = function() {
    if (!optimized_)
      return Object.keys(index_).length;
    return numWords_;
  };

  // verify that the internal state of dictionary is correct
  // throw exception if correction condition is not met
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

  this.stat = function(display, top) {
    // calculate and return statistics for a dictionary
    //var statistics = {};
    var freqIndex = {};
    //var maxRefs = {};
    var totalWords = 0;
    _.each(index_, function(value, key) {
      var o = value.c;
      if (_.isUndefined(freqIndex[o]))
        freqIndex[o] = [];
      freqIndex[o].push(key);
      totalWords += o;
    });

    var fk = Object.keys(freqIndex);

    // output result
    if (display) {
      top = top || 10;
      // print top `top` words
      for (var i = fk.length - 1; i >= 0 && top > 0; i--, top--) {
        var t = fk[i];
        console.log('%s : %j', cmn.padWithSymbol(t, 6, ' '), freqIndex[t]);
      }
    }

    return {total: totalWords, freq: freqIndex, index: index_};
  };
}


// ------------------------------------------------------------------------
//                             LEXICAL
// ------------------------------------------------------------------------
var Lexical = function(lang, data) {
  var obj = {
    letters   : new RegExp('['  + data.letters + ']', 'gm'),
    nonLetters: new RegExp('[^' + data.letters + '\\s]', 'gm'),
    question  : data.question,
    emphasis  : data.emphasis,
    language  : lang
  };

  // returns language name that is processed by the Lexical object
  this.getLanguage = function () {
    return obj.language;
  };

  // remove all punctuations and returns resulting string
  this.removePunctuations = function(str) {
    return str.replace(obj.nonLetters, '');
  };

  // remove all language related letters and returns resulting string
  this.removeLetters = function(str) {
    return str.replace(obj.letters, '');
  };
};


// ------------------------------------------------------------------------
//                          LEXICAL COLLECTION
// ------------------------------------------------------------------------
var LC = (function() {
  'use strict';

  var instance_; // instance stores a reference to the Singleton
  var langs_ = {};

  function init() {
    return {
      // load lexical collections from specified `file`
      load: function(file) {
        // clean previous call
        this.clean();
        var that = this;
        var data = fs.readFileSync(file, 'utf8');
        var js = JSON.parse(data);
        js.forEach(function(x) {
          var lang = x.lang;
          var data  = x.data;
          var lex = new Lexical(lang, data);
          that.addLexical(lex);
        });
      },

      clean: function() {
        langs_ = {};
      },

      // add lexical object into collection
      addLexical: function(lex) {
        var lang = lex.getLanguage();
        if (_.isUndefined(langs_[lang])) {
          langs_[lang] = lex;
        }
        else {
          throw 'Language \"' + lang + '\" is already exists';
        }
      },

      // get lexical object for specified `lang`, or null if not found
      getLexical: function(lang) {
        var ref = langs_[lang];
        if (_.isUndefined(ref))
          return null;
        return ref;
      },

      // returns true if the specified language is found in the collection,
      // otherwise false
      haveLexical: function(lang) {
        return !_.isUndefined(langs_[lang]);
      },

      // get array of availalbe languages
      getLanguages: function() {
        return Object.keys(langs_);
      }
    };
  }

  return {
    instance: function() {
      if (!instance_) {
        instance_ = init();
      }
      return instance_;
    }
  };
})();


exports.Dictionary = Dictionary;
exports.Lexical    = Lexical;
exports.LC         = LC;
