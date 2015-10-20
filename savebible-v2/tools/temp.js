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
  //var index = 0;

  return {
    combine: function() {
      console.log('Collector arrays count: ', arrays.length);
      if (arrays.length === 0)
        return null;
      if (arrays.length === 1)
        return arrays[0];

      var res = algo.combineSortedUniqueArrays(arrays[0], arrays[1]);
      for (var i = 2; i < arrays.length; ++i) {
        res = algo.combineSortedUniqueArrays(res, arrays[i]);
      }

      for (i = 0; i < arrays.length; ++i) {
        if (arrays[i].length === 0)
          console.error('DETECTED 0 length array');
        else
          console.log(arrays[i].length);
      }
      this.reset();
      return res;
    },

    add: function(array) {
      if (array === null)
        return;
      arrays.push(array);
      // if (arrays.length > index) {
      //   arrays[index++] = array;
      // }
      // else {
      //   arrays.push(array);
      //   index++;
      // }
    },

    reset: function() {
      arrays = [];
      //index = 0;
    }
  };
};

var suaCollector = new SortedUniqueArraysCollector();

var Node = function(letter) {
  this.letter = letter;
  this.parent = null;
  this.childs = {};
  //this.wcount = 0;
};

Node.prototype.addNode = function(node) {
  var r = this.childs[node.letter];
  if (_.isUndefined(r)) {
    this.childs[node.letter] = node;
    node.parent = this;
  }
  //this.wcount++;
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
  //this.wcount++;
};

Node.prototype.getRefs = function() {
  if (_.isUndefined(this.refs))
    return null;
  return this.refs;
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

var Dictionary = function() {
  this.root = new Node('');
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
    //node.wcount++;
    node = child;
  }
  node.addRef(ref);

  // var ciWord = word.toLowerCase();
  // if (ciWord !== word)
  //   this.add(ciWord, ref);
  return this;
};


function resultLogger(desc, word, result) {
  if (result !== null) {
    console.log(desc + ' [%d]: %s', result.length, word);
  } else {
    console.log(desc + ' [0]: %s', word);
  }
}


// Search functionality
var Search = function() {
  var dict = new Dictionary();

  // some temporary variables
  var result, condidates, node;

  // performs case sensitive and whole word searching
  function queryCS_WW(word) {
    node = dict.findNode(word);
    if (node === null)
      return null;
    result = node.getRefs();
    resultLogger('CS && WW', word, result);
    return result;
  }

  // perform case sensitive match only
  function queryCS(word) {
    node = dict.findNode(word);
    if (node === null)
      return null;
    node.getAllRefs(suaCollector);
    result = suaCollector.combine();
    resultLogger('CS', word, result);
    return result;
  }

/*
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
  }*/

  return {
    // add specified `word` into dictionary
    // during search `ref` will be returned
    add: function(word, ref) {
      word = word.trim();

      // ignore empty strings
      if (word.length === 0)
        return;
      dict.add(word, ref);
    },


    // build index should be call if words addition is completed
    build: function() {
      dict.optimize();
    },


    // get main dictionary, here we store all cases sensitive
    // unique words. i.e. no duplicate are presented
    getDictionary: function() {
      return dict;
    },


    // show internal state of dictionaries
    getStatistics: function() {
      return {
        'cs'   : dict.stat()
        // 'ci'   : cim_.stat(),
        // 'sub'  : swm_.stat(),
        // 'cisub': ciswm_.stat()
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

//console.log(require('util').inspect(n, {depth: 15, colors: true}));

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
  {getCombined: true, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
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

var opts = {cs: true, ww: false, op: 'and'};

var knownQueries = [
{w: 'Mat', c: 67},
{w: 'the', c: 30690},
{w: 'a', c: 31305},
{w: 'abo', c: 1234},
{w: 'bec', c: 1358},
{w: 'The', c: 5093},
{w: 'THE', c: 11},
{w: 'that', c: 11314},
{w: 'than', c: 1938},
{w: 'the', c: 30690}
];

// measur.begin('querying');
// for (var x = 0; x < 10; ++x) {
//   knownQueries.forEach(function(kq) {
//     var res = newSrch.query(kq.w, opts);
//     if (res.length != kq.c)
//       console.error('Query failed for: %s', kq.w);
//   });
// }
// measur.end();
// return;

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








// measur.begin('search module');
// var search = new srch.Search();
// var vit    = bible.verseIterator();
// var verse;
// while ((verse = vit.next()) !== null) {
//   var text = verse.render(textRndr);
//   var ref  = lb.encodeRef(verse.ref());
//   text     = lexic.removePunctuations(text);

//   // process every single word
//   var wordsArray = text.split(' ');
//   for (var i = 0; i < wordsArray.length; ++i)
//     search.add(wordsArray[i], ref);
// }
// search.buildIndex();
// measur.end();
