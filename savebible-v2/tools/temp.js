var cfg  = require('../config').cfg;
var lb   = require('../lib/bible');
var rndr = require('../lib/renderers');
var srch = require('../lib/search');
var cmn  = require('../lib/common');
var help = require('../helpers');
var path = require('path');
var fs   = require('fs-extra');
var _    = require('lodash');

var measur = new help.Measurer();

var startupInitialization = function() {
  lb.MC.instance().linkTo('eng', 'en');
  measur.begin('node ready');
  measur.end();
};

startupInitialization();


var Node = function(letter) {
  this.letter = letter;
  this.parent = null;
  this.childs = {};
};

Node.prototype.addNode = function(node) {
  var r = this.childs[node.letter];
  if (_.isUndefined(r)) {
    this.childs[node.letter] = node;
    node.parent = this;
  }
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
};

var NDictionary = function() {
  this.root = new Node('');
};

NDictionary.prototype.optimize = function() {
  this.root.optimize();
};

NDictionary.prototype.find = function(word) {
  var node = this.root;
  for (var i = 0; i < word.length; i++) {
    var letter = word[i];
    var child = node.getNode(letter);
    if (child === null)
      return null;
    node = child;
  }
  if (_.isUndefined(node.refs))
    return null;
  return node.refs;
};

NDictionary.prototype.add = function(word, ref) {
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


var dict  = new NDictionary();
var text = 'test case TEST';
var wordsArray = text.split(' ');
for (var i = 0; i < wordsArray.length; ++i)
  dict.add(wordsArray[i], i.toString());

console.log(dict.find('test'));
console.log(dict.find('case'));
console.log(dict.find('TEST'));
console.log(dict.find('case1'));
console.log(dict.find('cas'));
console.log(dict.find('Test'));

//console.log(require('util').inspect(dict.root, {depth: 15, colors: true}));
return;

var opts = [
  //{folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     },
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  {getCombined: true, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];


var name = 'en-kjv-usfm';
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

var dict  = new NDictionary();
//var dict  = new srch.Dictionary('original words');

var vit   = bible.verseIterator();
var verse;
while ((verse = vit.next()) !== null) {
  var text = verse.render(textRndr);
  var ref  = lb.encodeRef(verse.ref());
  text     = lexic.removePunctuations(text);

  // process every single word
  var wordsArray = text.split(' ');
  for (var i = 0; i < wordsArray.length; ++i)
    dict.add(wordsArray[i], ref);
}
dict.optimize();
measur.end();





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
// //search.buildIndex();
// measur.end();
