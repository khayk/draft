var argv            = require('minimist')(process.argv.slice(2));
var fs              = require('fs');
var path            = require('path');
var util            = require('util');
var _               = require('underscore');

//var agent         = require('webkit-devtools-agent');

var theBible        = require('./lib/bible.js');
var helper          = require('./lib/helper.js');
var common          = require('./lib/common.js');
var utils           = require('./utils/utils.js');
var cfg             = require('./configs.js').Configs;
var core            = require('./core.js');
var funcs           = require('./lib/functionality.js');
var search          = require('./lib/search.js');


var BBM             = theBible.BBM;
var Verse           = theBible.Verse;
var Chapter         = theBible.Chapter;
var Book            = theBible.Book;
var Bible           = theBible.Bible;
var USFMParser      = theBible.USFMParser;
var Renderer        = theBible.Renderer;
var TextRenderer    = theBible.TextRenderer;
var USFMRenderer    = theBible.USFMRenderer;
var Tags            = theBible.Tags;
var BibleStats      = theBible.BibleStats;
var encodeRef       = theBible.encodeRef;
var decodeRef       = theBible.decodeRef;

var createTestBook  = utils.createTestBook;
var createTestBible = utils.createTestBible;
var loadUSFMBible   = utils.loadUSFMBible;

// utils exports
var HiResTimer      = helper.HiResTimer;
var dropboxDir      = cfg.get_dropbox_dir();

var LC              = funcs.LC;
var Lexical         = funcs.Lexical;
var Dictionary      = funcs.Dictionary;

var Search          = search.Search;

timer               = new HiResTimer();

(function() {

  'use strict';


/*  function characterMap(str, map) {
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
  }*/

// ------------------------------------------------------------------------
//                             BIBLE SEARCH
// ------------------------------------------------------------------------
var BibleSearch = function() {
  var bible_    = null;
  var lexic_    = null;
  var search_   = null;
  var renderer_ = null;


  function initializeInternals() {
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
            var ref = encodeRef(verse.ref());
            text = lexic_.removePunctuations(text);

            // process every single word
            text.split(' ').forEach(function (word) {
              search_.add(word, ref);
            });
            verse = verse.next();
          }
          chap = chap.next();
        }
      }
      ti = toc.nextItem(ti.id);
    }

    search_.buildIndex();
    //search_.displayStatistics();
  }



  return {

    // initialize bible search module
    initialize: function(bible) {
      lexic_ = LC.instance().getLexical(bible.lang);
      if (lexic_ === null)
        throw 'Bible language is not specified or supported: ' + lang;
      bible_    = bible;
      initializeInternals();

      // console.log('SWM index: ',
      //             util.inspect(stat.index, false, 2, true),
      //             '\n');
    },


    searchWord: function(word, opts) {

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
          var res = renderer_.renderVerse(verse);
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



console.log(argv);

/*
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
*/

function toTitleCase(str)
{
  return str.replace(/\w\S*/g, function(txt) {
                        return txt.charAt(0).toUpperCase() +
                               txt.substr(1).toLowerCase();
                             });
}

function verify(res, refs) {
  if (res === null && refs === null)
    return;

  if ((refs === null && res !== null) ||
      (refs !== null && res === null) ) {
    console.error('FAILURE. Expected: ' + refs + ', was: ' + res);
    throw 'verification failed: ';
  }

  if (refs.length !== res.length)
    throw 'length mismatch: ';

  refs.forEach(function(e, i) {
    if (e !== res[i]) {
      console.error('FAILURE. Expected: ' + e + ', was: ' + res[i]);
      throw 'item mismatch';
    }
  });
}

var word = argv.word;
var opts = {};
if (argv.cs === 'false') {
  opts.cs = false;
}
if (argv.ww === 'false')
  opts.ww = false;


var search = new Search();
var words = ['EARTH', ''];
var xref  = '01001001';
var axref = [xref];


words.forEach(function(w) {
  search.add(w, xref);
});

search.buildIndex();



var orig = words[0];
var tcase = toTitleCase(orig);
var lcase = orig.toLowerCase();
var ucase = orig.toUpperCase();


// cs & ww -------------------------------------------------------
var res;
var opt  = {cs: true,  ww: true};

res = search.searchWord(orig, opt);
verify(res, axref);
res = search.searchWord(tcase, opt);
verify(res, null);
res = search.searchWord(lcase, opt);
verify(res, null);


// cs & ww -------------------------------------------------------
opt  = {cs: true,  ww: false};

res = search.searchWord(orig, opt);
verify(res, axref);
res = search.searchWord(tcase, opt);
verify(res, null);
res = search.searchWord(lcase, opt);
verify(res, null);


// search.searchWord('SIMPLE', {cs: true,  ww: false});
// search.searchWord('Simple', {cs: true,  ww: false});
// search.searchWord('simple', {cs: true,  ww: false});

// search.searchWord('siMple', {cs: false,  ww: true});
// search.searchWord('Simple', {cs: false,  ww: true});
// search.searchWord('simple', {cs: false,  ww: true});


// search.searchWord(word, {cs: true,  ww: false});
// search.searchWord(word, {cs: false, ww: true});
// search.searchWord(word, {cs: false, ww: false});
}());



