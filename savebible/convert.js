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

var LexicalCollection = funcs.LexicalCollection;
var Lexical           = funcs.Lexical;
var Dictionary        = funcs.Dictionary;

(function() {

  'use strict';


  var BibleSearch = function() {
    var bible_ = null;
    var dict_  = null;
    var lexic_ = null;

    return {
      initialize: function(bible, dictionary) {
        bible_ = bible;
        dict_  = dictionary;
        lexic_ = LexicalCollection.getLexical(bible_.lang);
      },

      searchText: function(text) {
        var refs = [];
        return refs;
      },

      navigate: function(query) {
      }
    };
  };

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

  function main() {
    try {
      LexicalCollection.init('./data/lexical.json');
      var lex = LexicalCollection.getLexical('hy');

    } catch (e) {
      console.error('ERROR:', e);
    }
  }

  main();
}());
