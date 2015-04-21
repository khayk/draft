var fs = require('fs');
var _  = require('underscore');

// ------------------------------------------------------------------------
//                             DICTIONARY
// ------------------------------------------------------------------------
function Dictionary() {
  var optimized_ = false;
  var index_     = {};
  var numWords_  = 0;
  var changed_   = 0;

  // words are case sensitive
  this.add = function(word, ref) {
    //var word = word.toLowerCase();
    if (_.isUndefined(index_[word]))
      index_[word] = {c: 0, refs: []};
    index_[word].refs.push(ref);
    index_[word].c++;
    optimized_ = false;
    changed_   = true;
  };

  // optimize dictionary
  this.optimize = function() {
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
    //var lcword = word.toLowerCase();
    var r = index_[word];
    if (_.isUndefined(r))
      return null;
    return r.refs;
  };

  // returns array of all words
  this.words = function() {
    return Object.keys(index_);
  };

  // returns number of words
  this.count = function() {
    if (!optimized_)
      return Object.keys(index_).length;
    return numWords_;
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
var LexicalCollection = (function() {
  var langs_ = {};

  return {
    // initialize lexical collection from lexFile
    init: function(lexFile) {
      // clean previous call
      this.clean();
      var that = this;
      var data = fs.readFileSync(lexFile, 'utf8');
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

    // get array of availalbe languages
    getLanguages: function() {
      return Object.keys(langs_);
    },

    // returns true if the specified language is found in the collection,
    // otherwise false
    haveLanguage: function(lang) {
      return !_.isUndefined(langs_[lang]);
    },
  };
})();


exports.Dictionary        = Dictionary;
exports.Lexical           = Lexical;
exports.LexicalCollection = LexicalCollection;
