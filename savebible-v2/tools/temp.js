var cfg  = require('../config').cfg;
var lb   = require('../lib/bible');
var rndr = require('../lib/renderers');
var srch = require('../lib/search');
var cmn  = require('../lib/common');
var help = require('../helpers');
var path = require('path');
var fs   = require('fs-extra');
var _    = require('lodash');
var readline    = require('readline');

var measur = new help.Measurer();
var algo   = srch.algo;

var startupInitialization = function() {
  lb.MC.instance().linkTo('eng', 'en');
  measur.begin('node ready');
  measur.end();
};

startupInitialization();

var SortedUniqueArraysCollector = function() {
  var arrays = [];

  function sortArrays() {
    arrays.sort(function(x, y) {
      if (x.length < y.length) {
        return -1;
      }
      if (x.length > y.length) {
        return 1;
      }
      return 0;
    });
  }

  function dumpArrays() {
    console.log('Dumping arrays...');
    for (i = 0; i < arrays.length; ++i)
      console.log(arrays[i].length);
    console.log('Dumping completed');
  }

  function combineArrays(l, h) {
    if (h - l === 1)
      return algo.combineSortedUniqueArrays(arrays[l], arrays[h]);
    else if (l == h)
      return arrays[l];
    else if (l > h)
      return [];

    var count = 0;
    for (var i = l; i < h; i++)
      count += arrays[i].length;
    var tmp = 0;
    for (var m = l; m < h; m++) {
      tmp += arrays[i].length;
      if (tmp >= count / 2)
        break;
    }
    var a1 = combineArrays(l, m);
    var a2 = combineArrays(m + 1, h);
    return algo.combineSortedUniqueArrays(a1, a2);
  }

  return {
    combine: function() {
      if (arrays.length > 10)
        console.log('Collector arrays count: ', arrays.length);

      if (arrays.length === 0)
        return [];
      if (arrays.length === 1)
        return arrays[0];
      sortArrays();
      var res = algo.combineSortedUniqueArrays(arrays[0], arrays[1]);
      for (var i = 2; i < arrays.length; ++i) {
        res = algo.combineSortedUniqueArrays(res, arrays[i]);
      }
      return res;

      // var i = 0;
      // var res = [];//algo.combineSortedUniqueArrays(arrays[0], arrays[1]);
      // for (i = 0; i < arrays.length; i++) {
      //   if (arrays[i].length < 25)
      //     res = algo.combineSortedUniqueArrays(res, arrays[i]);
      //   else
      //     break;
      // }
      // var t = combineArrays(i, arrays.length - 1);
      // return algo.combineSortedUniqueArrays(res, t);

    },

    // combine: function() {
    //   if (arrays.length > 10)
    //     console.log('Collector arrays count: ', arrays.length);

    //   tmp = 0;
    //   for (var i = 0; i < arrays.length; ++i) {
    //     arrays[i].forEach(useRef);
    //   }
    //   console.log('- >>>>>>>>>> ', tmp);

    //   var keys = Object.keys(refs);
    //   keys.sort();
    //   var len = keys.length;

    //   ensureCache(len);
    //   var ci = 0;
    //   for (i = 0; i < len; i++) {
    //     var k = keys[i];
    //     if (refs[k] !== undefined)
    //       cache[ci++] = k;
    //   }
    //   return cache.slice(0, ci);
    // },

    add: function(array) {
      if (array.length === 0)
        return;
      arrays.push(array);
    },

    reset: function() {
      arrays = [];
    }
  };
};

var suaCollector = new SortedUniqueArraysCollector();

var Node = function(letter) {
  this.letter = letter;
  this.parent = null;
  this.childs = {};
  this.refs   = [];
  this.uwc    = 0;    // unique words count (including childs words)
  this.twc    = 0;    // total words count (including childs words)
};

Node.prototype.addNode = function(node) {
  var r = this.childs[node.letter];
  if (_.isUndefined(r)) {
    this.childs[node.letter] = node;
    node.parent = this;
  }
};

Node.prototype.getNode = function(letter) {
  var r = this.childs[letter];
  if (_.isUndefined(r))
    return null;
  return r;
};

Node.prototype.addRef = function(ref) {
  if (this.refs.length === 0) {
    this.uwc++;
  }
  this.refs.push(ref);
  this.onWordAdded();
};

Node.prototype.getRefs = function() {
  return this.refs;
};

Node.prototype.getAllRefs = function(collector) {
  collector.add(this.getRefs());
  _.each(this.childs, function(node, key) {
    node.getAllRefs(collector);
  });
};

Node.prototype.addedWordsCount = function() {
  return this.twc;
};

Node.prototype.uniqueWordsCount = function() {
  return this.uwc;
};

Node.prototype.onWordAdded = function() {
  this.twc++;
  if (this.parent !== null)
    this.parent.onWordAdded();
};

// only for-loop declaration with concatenation
function reverse(s) {
  for (var i = s.length - 1, o = ''; i >= 0; o += s[i--]) { }
  return o;
}

Node.prototype.collectWords = function(words) {
  var refs = this.getRefs();
  if (refs.length !== 0) {
    var parent = this;
    var word = '';
    while (parent !== null) {
      word += parent.letter;
      parent = parent.parent;
    }
    word = reverse(word);
    words[word] = {uwc: this.uwc, twc: this.twc};
  }

  _.each(this.childs, function(node, key) {
    node.collectWords(words);
  });
};


Node.prototype.optimize = function() {
  _.each(this.childs, function(value, key) {
    value.optimize();
  });

  if (this.refs.length > 1) {
    this.refs.sort();
    this.refs = _.unique(this.refs, true);
  }
};

Node.prototype.verify = function() {
  _.each(this.childs, function(value, key) {
    value.verify();
  });

  if (this.refs.length > 1) {
    var o = value.refs;
    for (var i = o.length - 1; i > 0; i--) {
      if (o[i] < o[i - 1]) {
        throw new Error('Verification failed');
      }
    }
  }
};


var Dictionary = function() {
  this.root = new Node('');
};

Dictionary.prototype.find = function(word) {
  var node = this.findNode(word);
  if (node === null)
    return [];
  return node.getRefs();
};

Dictionary.prototype.count = function() {
  return this.root.uniqueWordsCount();
};

Dictionary.prototype.occurrence = function(word) {
  var node = this.findNode(word);
  if (node === null)
    return 0;
  return node.addedWordsCount();
};

Dictionary.prototype.add = function(word, ref) {
  if (word.length === 0)
    return;

  var node = this.root;
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
  return this;
};

Dictionary.prototype.optimize = function() {
  this.root.optimize();
};

Dictionary.prototype.words = function() {
  var node = this.root;
  var words = {};
  node.collectWords(words);
  return words;
};

Dictionary.prototype.findNode = function(word) {
  var node = this.root;
  for (var i = 0; i < word.length; i++) {
    var letter = word[i];
    var child = node.getNode(letter);
    if (child === null)
      return null;
    node = child;
  }
  return node;
};

function resultLogger(desc, word, result) {
  console.log(desc + _.padRight(' [' + result.length + ']', 8, ' ') +  ': %s', word);
}


// Search functionality
var Search = function() {
  var cs_ = new Dictionary();
  var ci_ = new Dictionary();

  // some temporary variables
  var result = [];
  var node   = null;

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
    suaCollector.reset();
    node.getAllRefs(suaCollector);
    result = suaCollector.combine();
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
    suaCollector.reset();
    node.getAllRefs(suaCollector);
    result = suaCollector.combine();
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


    // build index should be called before performing any queries
    build: function() {
      cs_.optimize();
      ci_.optimize();
    },


    // get main dictionary, here we store all cases sensitive
    // unique words. i.e. no duplicate are presented
    getDictionary: function() {
      return cs_;
    },


    // show internal state of dictionaries
    getStatistics: function() {
      return {
        'cs'   : cs_.stat(),
        'ci'   : ci_.stat()
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

var dict  = new Dictionary();
var text = 'It is going to be an an amazing search engine to be';
var wordsArray = text.split(' ');
for (var i = 0; i < wordsArray.length; ++i)
  dict.add(wordsArray[i], i.toString());

dict.optimize();
var n = dict.findNode('');
if (n === null) {
  console.log('Not found');
}
else {
  n.getAllRefs(suaCollector);
  console.log(suaCollector.combine());
}

console.log(dict.words());
//console.log(require('util').inspect(n, {depth: 15, colors: true}));
// return;

// console.log(dict.find('test'));
// console.log(dict.find('case'));
// console.log(dict.find('TEST'));
// console.log(dict.find('case1'));
// console.log(dict.find('cas'));
// console.log(dict.find('Test'));

// console.log(require('util').inspect(dict.root, {depth: 15, colors: true}));

var opts = [
  //{folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     },
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  {getCombined: false, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];


var name = 'en-kjv-usfm+';
var input  = cfg.bibleDir(name).from;
var output = cfg.bibleDir(name).to;


measur.begin('loading bible');
var bible = lb.loadBible(input, {types: []});
measur.end();

measur.begin('search module initialization');
var textRndr = new rndr.TextRenderer();
var meta     = lb.MC.instance().getMeta(bible.lang);
if (meta === null)
  throw new Error('Bible language is not specified or supported: ' + bible.lang);

var lexic = meta.lex;
var newSrch = new Search();
var vit   = bible.verseIterator();
var verse;
while ((verse = vit.next()) !== null) {
  var text = verse.render(textRndr);
  var ref  = lb.encodeRef(verse.ref());
  text     = lexic.removePunctuations(text);

  // process every single word
  var wordsArray = text.split(' ');
  for (var i = 0; i < wordsArray.length; ++i)
    newSrch.add(wordsArray[i], ref);
}
newSrch.build();
measur.end();

function verify(expectations, opts, desc) {
  measur.begin('querying');
  expectations.forEach(function(kq) {
    var res = newSrch.query(kq.w, opts);
    if (res.length != kq.c)
      console.error(desc + 'Query failed for "%s", expected %d to be equal %d', kq.w, kq.c, res.length);
  });
  measur.end();
}


var opts = {cs: true, ww: true, op: 'and'};
var knownQueries_CS_WW = [
  {w: 'Mat', c: 0},
  {w: 'the', c: 26878},
  {w: 'a', c: 7199},
  {w: 'abo', c: 0},
  {w: 'bec', c: 0},
  {w: 'The', c: 2019},
  {w: 'THE', c: 11},
  {w: 'that', c: 11313},
  {w: 'than', c: 532},
];
verify(knownQueries_CS_WW, opts, 'CS && WW: ');


opts.cs = true;
opts.ww = false;
var knownQueries_CS = [
  {w: 'Mat', c: 67},
  {w: 'the', c: 30690},
  {w: 'a', c: 7199},   // 31305 - without restriction
  {w: 'abo', c: 1234},
  {w: 'bec', c: 1358},
  {w: 'The', c: 5093},
  {w: 'THE', c: 11},
  {w: 'that', c: 11314},
  {w: 'than', c: 694},
  {w: 'the', c: 30690}
];
verify(knownQueries_CS, opts, 'CS: ');


opts.cs = false;
opts.ww = true;
var knownQueries_WW = [
  {w: 'Mat', c: 0},
  {w: 'the', c: 27376},
  {w: 'a', c: 7369},
  {w: 'abo', c: 0},
  {w: 'bec', c: 0},
  {w: 'The', c: 27376},
  {w: 'THE', c: 27376},
  {w: 'that', c: 11534},
  {w: 'THAT', c: 11534},
  {w: 'than', c: 532},
];
verify(knownQueries_WW, opts, 'WW: ');


opts.cs = false;
opts.ww = false;
var knownQueries_NO_RESTRICTION = [
  {w: 'Mat', c: 215},
  {w: 'the', c: 31312},
  {w: 'a', c: 7369},     // 32917 - without restriction
  {w: 'of', c: 20728},    // 21244 - without restriction
  {w: 'abo', c: 1245},
  {w: 'bec', c: 1554},
  {w: 'The', c: 31312},
  {w: 'THE', c: 31312},
  {w: 'that', c: 11535},
  {w: 'THAT', c: 11535},
  {w: 'than', c: 696},
];
verify(knownQueries_NO_RESTRICTION, opts, '..: ');


function query(istr, opts, count) {
  if (_.isUndefined(count))
    count = 1;
  measur.begin('querying', istr);
  for (var i = 0; i < count; ++i)
    newSrch.query(istr, opts);
  measur.end();
}

var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('ENTER> ');
rl.prompt();

rl.on('line', function(line) {
  var istr = line.trim();
  if (istr === 'EXIT')
    process.exit(0);

  query(istr, opts, 1);

  rl.prompt();

}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});
