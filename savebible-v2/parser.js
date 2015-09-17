(function() {

'use strict';

var fs   = require('fs');
var util = require('util');
var _    = require('lodash');
var path = require('path');
var cfg  = require('./config').cfg;
var lb   = require('./lib/bible');
var cmn  = require('./lib/common');
var rnd  = require('./lib/renderers');
var log  = require('log4js').getLogger('psr');
var help = require('./helpers');

var measur   = new help.Measurer();

var Node = cmn.Node;
var TAG  = cmn.TAG;
var TH   = cmn.TH;
var NH   = cmn.NH;


// open       close          ended
// \v           .          \v, \c, \p
// \c           .          \c
// \p           .          \p, \c
// \q           .          \q, \p
// \b           .          \*
// \s                      \*


var Stack = function() {
  this.values = [];
};

Stack.prototype.size = function() {
  return this.values.length;
};

Stack.prototype.empty = function() {
  return this.values.length === 0;
};

Stack.prototype.top = function() {
  if (this.values.length === 0)
    return null;
  return this.values[this.values.length - 1];
};

Stack.prototype.push = function(val) {
  this.values.push(val);
};

Stack.prototype.pop = function() {
  if (this.empty())
    return null;
  return this.values.pop();
};

var arr_cpq = ['c', 'p', 'q', ''];
var arr_cp  = ['c', 'p'];
var arr_c   = ['c', ''];
var arr_    = [''];

function isNodeAnyOf(node, arr) {
  var tag = node.tag;
  return arr.indexOf(tag) !== -1;
}

var USFMTree = function() {
  this.reset();
};

USFMTree.prototype.reset = function() {
  this.stack = new Stack();
  this.root  = NH.createTag('');
  this.stack.push(this.root);
  this.nre = /\d+\s+/;
};

USFMTree.prototype.specialPop = function() {
  var prev = this.stack.pop();

  // trim tailing spaces for last child nodes
  if (!TH.haveClosing(prev.tag)) {
    var last = prev.lastChild();
    if (last !== null && NH.isText(last))
      last.text = last.text.trimRight();
  }

  var top = this.stack.top();
  return top;
};

USFMTree.prototype.unwind = function(tag) {
  var top = null;
  while (true) {
    top = this.stack.top();
    if (top === null || top.tag === tag)
      break;
    this.stack.pop();
  }

  if (top !== null) {
    top = this.stack.pop();
  }
};

USFMTree.prototype.append = function(node) {
  var top = this.stack.top();
  if (NH.isTag(node)) {
    if (node.tag === TAG.V) {
      // pop elements from the stack to have consistent state
      while (!isNodeAnyOf(top, arr_cpq)) {
        top = this.specialPop();
      }
    }
    else if (node.tag === TAG.P || node.tag === TAG.B) {
      while (!isNodeAnyOf(top, arr_c)) {
        top = this.specialPop();
      }
    }
    else if (node.tag === TAG.Q) {
      while (!isNodeAnyOf(top, arr_cp)) {
        top = this.specialPop();
      }
    }
    else if (node.tag === TAG.C) {
      while (!isNodeAnyOf(top, arr_)) {
        top = this.specialPop();
      }
    }
    else if (!TH.haveClosing(node.tag)) {
      while (!isNodeAnyOf(top, arr_c)) {
        top = this.specialPop();
      }
    }
  }
  else {
    if (top.tag === TAG.V || top.tag === TAG.C) {

      // setup number for verse or chapter
      if (_.isUndefined(top.number)) {
        var arr = this.nre.exec(node.text);
        if (arr === null)
          throw new Error('expecting to see number in: ' + node.text);

        top.number = arr[0].trim();
        node.text = node.text.substring(arr.index + arr[0].length);
      }

      if (node.text.length === 0)
        return;
    }
    else {
      if (node.text.trim().length === 0)
        return;
    }
  }

  top.addChild(node);
  if (NH.isTag(node))
    this.stack.push(node);
};


// var text = null;
// var single = ['p', 'v', 'c', 'q', 'b', 's'];
// var paired =  ['add', 'dc', 'nd', 'qt', 'wj'];
var paired  = /add|dc|nd|qt|wj/;

function parseUSFMBook(str) {
  var nre = /\d+/gm;
  var vre = /(\\\+?(\w+)\s?\*?)/gm;
  var tree = new USFMTree();
  var lastIndex = 0, number = 0;
  var node = null;
  var content = '';
  str = str.replace(/\r/gm, '').replace(/\n|¶/gm, ' ').trim();

  function insertText(from, to) {
    content = str.substring(from, to);
    node = NH.createText(content);
    tree.append(node);
  }

  var arr = vre.exec(str);
  while (arr !== null) {
    var tag = arr[1];

    if (lastIndex != arr.index) {
      insertText(lastIndex, arr.index);
    }

    if (TH.isOpening(tag)) {
      tag = arr[2];
      node = NH.createTag(tag);
      tree.append(node);
    }
    else {
      tree.unwind(arr[2]);
    }

    lastIndex = vre.lastIndex;
    arr = vre.exec(str);
  }
  insertText(lastIndex);
  return tree;
}


var dirNames = [
  //'en-kjv-usfm+ [saved]'
  //'zed'
  'en-kjv-usfm+ [saved]'
  //'am-eab-usfm-from-text',
  //'ru-synod-usfm-from-text [saved]'
];

var bids = ['SIR'];

var indentedUSFMRenderer = new rnd.IndentedUSFMRenderer();
var usfmRenderer         = new rnd.USFMRenderer();
var textRenderer         = new rnd.TextRenderer();


measur.begin('loading bible: ');
bids.forEach(function(bid) {
  dirNames.forEach(function(dn) {
    var file = lb.findBook(cfg.bibleDir(dn).from, bid);
    if (file === null) {
      log.info('failed to find book with id: %s', bid);
      return;
    }

    log.info(file);
    var str  = fs.readFileSync(file, 'utf8');
    var tree = parseUSFMBook(str);
    //tree.root.normalize();
    console.log(tree.stack.size());
    console.log("nodes: ", tree.root.count());

    fs.writeFileSync('usfm.dat', usfmRenderer.renderNode(tree.root, 0, 0));
    fs.writeFileSync('usfm_indented.dat', indentedUSFMRenderer.renderNode(tree.root, 0, 0));
    fs.writeFileSync('text.dat', textRenderer.renderNode(tree.root, 0, 0));

    tree.root.normalize();
    console.log("nodes after normalize: ", tree.root.count());

    //console.log(util.inspect(tree.root, {depth: 15, colors: true}));
  });
});
measur.end();


// scan all books
var dir = cfg.bibleDir(dirNames[0]).from;
var files = fs.readdirSync(dir, 'utf8');

measur.begin('loading bible: ' + dir);
files.forEach(function(file) {
  var str  = fs.readFileSync(path.join(dir, file), 'utf8');
  var tree = parseUSFMBook(str);
  fs.writeFileSync(cfg.tmpDir() + file, usfmRenderer.renderNode(tree.root, 0, 0));
  fs.writeFileSync(cfg.tmpDir() + path.basename(file, path.extname(file)) + '.txt', textRenderer.renderNode(tree.root, 0, 0));
});
measur.end();

})();