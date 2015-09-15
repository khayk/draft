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


var USFMTree = function() {
  this.stack = new Stack();
  this.root  = NH.createTag('');
  this.stack.push(this.root);

  // this.top = function() {
  //   return this.stack.top();
  // };
};

function isNodeAnyOf(node, arr) {
  if (!NH.isTag(node))
    return false;
  var tag = node.tag;
  return arr.indexOf(tag) !== -1;
}

var arr_cpq = ['c', 'p', 'q', ''];
var arr_cp  = ['c', 'p'];
var arr_c   = ['c', ''];
var arr_    = [''];

USFMTree.prototype.addNode = function(node) {
  if (node === null) {
    this.stack.pop();
    return;
  }

  var top = this.stack.top();
  if (NH.isTag(node)) {
    if (node.tag === TAG.V) {
      // pop elements from the stack to have consistent state
      while (!isNodeAnyOf(top, arr_cpq)) {
        this.stack.pop();
        top = this.stack.top();
      }
    }
    else if (node.tag === TAG.P || node.tag === TAG.B) {
      while (!isNodeAnyOf(top, arr_c)) {
        this.stack.pop();
        top = this.stack.top();
      }
    }
    else if (node.tag === TAG.Q) {
      while (!isNodeAnyOf(top, arr_cp)) {
        this.stack.pop();
        top = this.stack.top();
      }
    }
    else if (node.tag === TAG.C) {
      while (!isNodeAnyOf(top, arr_)) {
        this.stack.pop();
        top = this.stack.top();
      }
    }
    else if (!TH.haveClosing(node.tag)) {
      //console.log(node.tag);
      while (!isNodeAnyOf(top, arr_c)) {
        this.stack.pop();
        top = this.stack.top();
      }
    }
  }

  top.addChild(node);
  this.stack.push(node);
};


// var text = null;
// var single = ['p', 'v', 'c', 'q', 'b', 's'];
// var paired =  ['add', 'dc', 'nd', 'qt', 'wj'];
var paired  = /add|dc|nd|qt|wj/;

function parseUSFMBook(file) {
  var nre = /\d+/gm;
  var vre = /(\\\+?(\w+)\*?)/gm;
  var str = fs.readFileSync(file, 'utf8');
  var tree = new USFMTree();
  var lastIndex = 0, number = 0;
  var node = null;
  var content = '';

  var arr = vre.exec(str);
  while (arr !== null) {
    var tag = arr[1];
    number = 0;

    // if (arr[2] === TAG.V || tag === TAG.C) {
    //   var x1 = lastIndex;

    //   nre.lastIndex = vre.lastIndex;
    //   number = nre.exec(str)[0];
    //   vre.lastIndex = nre.lastIndex;
    //   lastIndex = vre.lastIndex;

    //   console.log('ai %d, before %d, after %d', arr.index, x1, lastIndex);
    // }

    if (lastIndex != arr.index) {
      content = str.substring(lastIndex, arr.index).trim();
      //console.log(content);
      node = NH.createText(content);
      tree.addNode(node);

      if (number !== 0) {
        node.number = number;
      }
    }

    if (TH.isOpening(tag)) {
      tag = arr[2];
      node = NH.createTag(tag);
      tree.addNode(node);
    }
    else {
      tree.addNode(null);
    }

    lastIndex = vre.lastIndex;
    arr = vre.exec(str);
  }

  content = str.substring(lastIndex).trim();
  node = NH.createText(content);
  tree.addNode(node);


  console.log(tree.stack.size());
  var renderer = new rnd.USFMRenderer();
  fs.writeFileSync('res.txt', renderer.renderNode(tree.root, -1));
}


var dirNames = [
  'en-kjv-usfm+'
  //'am-eab-usfm-from-text',
  //'ru-synod-usfm-from-text [saved]'
];

var bids = ['PSA'];

bids.forEach(function(bid) {
  dirNames.forEach(function(dn) {
    var file = lb.findBook(cfg.bibleDir(dn).from, bid);
    if (file === null) {
      log.info('failed to find book with id: %s', bid);
      return;
    }

    log.info(file);
    parseUSFMBook(file);

    //console.log(util.inspect(tree.root, {depth: 15, colors: true}));
  });

});


})();