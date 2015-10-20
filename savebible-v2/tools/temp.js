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

  return {
    combine: function() {
      if (arrays.length > 100)
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
    },

    add: function(array) {
      if (array === null)
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
  this.trc    = 0;      // total references count (including child node refs)
};

Node.prototype.onRefAdded = function() {
  this.trc++;
  if (this.parent !== null)
    this.parent.onRefAdded();
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
  if (_.isUndefined(this.refs))
    this.refs = [];
  this.refs.push(ref);
  this.onRefAdded();
};

Node.prototype.getRefs = function() {
  if (_.isUndefined(this.refs))
    return [];
  return this.refs;
};

Node.prototype.totalRefsCount = function() {
  return this.trc;
};

Node.prototype.getAllRefs = function(collector) {
  collector.add(this.getRefs());
  _.each(this.childs, function(node, key) {
    node.getAllRefs(collector);
  });
};

Node.prototype.optimize = function() {
  _.each(this.childs, function(value, key) {
    value.optimize();
  });

  if (!_.isUndefined(this.refs)) {
    this.refs.sort();
    this.refs = _.unique(this.refs, true);
  }
};

Node.prototype.verify = function() {
  _.each(this.childs, function(value, key) {
    value.verify();
  });

  if (!_.isUndefined(this.refs)) {
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
  return this.root.totalRefsCount();
};

Dictionary.prototype.occurrence = function(word) {
  var node = this.findNode(word);
  if (node === null)
    return -1;
  return node.totalWordsCount();
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

// var dict  = new Dictionary();
// var text = 'It is going to be an amazing search engine';
// var wordsArray = text.split(' ');
// for (var i = 0; i < wordsArray.length; ++i)
//   dict.add(wordsArray[i], i.toString());

// var n = dict.findNode('');
// if (n === null) {
//   console.log('Not found');
// }
// else {
//   n.getAllRefs(suaCollector);
//   console.log(suaCollector.combine());
// }

// console.log(require('util').inspect(n, {depth: 15, colors: true}));
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


measur.begin('dictionary module');
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

// measur.begin('searching');
// newSrch.query('the');
// measur.end();

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
verify(knownQueries_NO_RESTRICTION, opts, 'NR: ');


var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('ENTER> ');
rl.prompt();

rl.on('line', function(line) {
  var istr = line.trim();
  if (istr === 'EXIT')
    process.exit(0);

  measur.begin('querying', istr);
  var res = newSrch.query(istr, opts);
  measur.end();

  rl.prompt();

}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});
