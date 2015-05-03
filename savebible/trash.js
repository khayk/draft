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

    search_.buildIndex();
    search_.displayStatistics();
  }



  return {

    // initialize bible search module
    initialize: function(bible) {
      lexic_ = LC.instance().getLexical(bible.lang);
      if (lexic_ === null)
        throw 'Bible language is not specified or supported: ' + bible.lang;
      bible_    = bible;
      initializeInternals();

      // console.log('SWM index: ',
      //             util.inspect(stat.index, false, 2, true),
      //             '\n');
    },


    searchWord: function(word, opts) {
      return search_.searchWord(word, opts);
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
        value.r = this.searchWord(key);
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

    searchAllWords: function() {
      var maxLength = 0;
      var resWord;
      search_.getDictionary().words().forEach(function(w) {
        var res = search_.searchWord(w, {cs:false, ww:false});
        if (maxLength < res.length) {
          maxLength = res.length;
          resWord = w;
        }
      });

      console.log("Max lenght: %d, word: %s", maxLength, resWord);
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
          console.log('%s(%d) -> %s', word, matches.length, res);
        }
      });
    }
  };
};



console.log(argv);


var LCO = LC.instance();
LCO.load('./data/lexical.json');

timer.start();
//var bible = createTestBible();
var bible = loadUSFMBible(dropboxDir + '/' + 'Data/zed/');
bible.lang = 'en';
var search = new BibleSearch();

timer.stop();
timer.report();

console.log(util.inspect(process.memoryUsage()));
for (var i = 0; i < 1; ++i) {
  timer.start();
  search.initialize(bible);
  timer.stop();
  timer.report();
}
console.log(util.inspect(process.memoryUsage()));

console.log("Searching all words...");
timer.start();
search.searchAllWords();
timer.stop();
timer.report();
console.log(util.inspect(process.memoryUsage()));

var opts = {};
if (argv.cs === 'false') {
  opts.cs = false;
}
if (argv.ww === 'false')
  opts.ww = false;


// var readline = require('readline'),
//     rl = readline.createInterface(process.stdin, process.stdout);


// rl.setPrompt('OHAI> ');
// rl.prompt();

// rl.on('line', function(line) {
//   var istr = line.trim();
//   if (istr === 'EXIT')
//     process.exit(0);

//   var res = search.searchWord(istr, opts);
//   //console.log(res);
//   search.expend(istr, res, opts.cs);

//   rl.prompt();
// }).on('close', function() {
//   console.log('Have a great day!');
//   process.exit(0);
// });



/*
function verify(res, refs) {
  return;
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
var words = [
  {w: 'EARTH', r: '1'},
  {w: 'temp', r: '2'},
  {w: 'HELLO', r: '3'},
  {w: 'Help', r: '4'},
  {w: 'helper', r: '5'},
  {w: 'at', r: '6'},
  {w: 'a', r: '7'}];

var xref  = '01001001';
var axref = [xref];


words.forEach(function(w) {
  search.add(w.w, w.r);
});

search.buildIndex();
search.displayStatistics();

var orig = words[6].w;
var tcase = toTitleCase(orig);
var lcase = orig.toLowerCase();
var ucase = orig.toUpperCase();

var res, i, opt;


// cs & ww -------------------------------------------------------
opt = {cs: true,  ww: true};
console.log('\n----- OPTIONS CHANGED: ', opt);

res = search.searchWord(orig, opt);
verify(res, axref);
for (i = 3; i < orig.length; ++i) {
  res = search.searchWord(orig.substr(0, i), opt);
  verify(res, null);
}

res = search.searchWord(tcase, opt);
if (orig.indexOf(tcase) !== -1)
  verify(res, axref);
else
  verify(res, null);

res = search.searchWord(lcase, opt);
if (lcase !== orig)
  verify(res, null);
else
  verify(res, axref);



// cs -----------------------------------------------------------
opt  = {cs: true,  ww: false};
console.log('\n----- OPTIONS CHANGED: ', opt);

res = search.searchWord(orig, opt);
verify(res, axref);
for (i = 3; i < orig.length; ++i) {
  res = search.searchWord(orig.substr(0, i), opt);
  verify(res, axref);
}
res = search.searchWord(tcase, opt);
if (orig.indexOf(tcase) !== -1)
  verify(res, axref);
else
  verify(res, null);

res = search.searchWord(lcase, opt);
if (orig.indexOf(lcase) !== -1)
  verify(res, axref);
else
  verify(res, null);


// ww -----------------------------------------------------------
opt  = {cs: false,  ww: true};
console.log('\n----- OPTIONS CHANGED: ', opt);
res = search.searchWord(orig, opt);
verify(res, axref);
for (i = 3; i < orig.length; ++i) {
  res = search.searchWord(orig.substr(0, i), opt);
  verify(res, null);
}
res = search.searchWord(tcase, opt);
verify(res, axref);
res = search.searchWord(lcase, opt);
verify(res, axref);


// --------------------------------------------------------------
opt  = {cs: false,  ww: false};
console.log('\n----- OPTIONS CHANGED: ', opt);
res = search.searchWord(orig, opt);
verify(res, axref);
for (i = 3; i < orig.length; ++i) {
  res = search.searchWord(orig.substr(0, i), opt);
  verify(res, axref);
}

orig = orig.toLowerCase();
for (i = 3; i < orig.length; ++i) {
  res = search.searchWord(orig.substr(0, i), opt);
  verify(res, axref);
}

res = search.searchWord(tcase, opt);
verify(res, axref);
res = search.searchWord(lcase, opt);
verify(res, axref);
*/
