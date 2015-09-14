(function() {

'use strict';

var fs   = require('fs');
var _    = require('lodash');
var path = require('path');
var cfg  = require('./config').cfg;
var lb   = require('./lib/bible');
var log  = require('log4js').getLogger('psr');

function findBook(dir, bid) {
  var files  = fs.readdirSync(dir, 'utf8');
  var rf = null;
  var found = false;
  files.forEach(function(file) {
    var res = lb.decodeFileName(file, true);
    if (found === false && res !== null && res.id === bid) {
      rf = path.join(dir,  file);
      found = true;
    }
  });
  return rf;
}

var dirNames = [
  'zed'
  //'am-eab-usfm-from-text',
  //'ru-synod-usfm-from-text [saved]'
];

var bids = ['SIR'];

var Node = function() {
};

// @param {object} node  object that is going to become child
// @return this
Node.prototype.addChild = function(node) {
  if (this.firstChild() === null) {
    this.first = node;
    this.last  = node;
  }
  else {
    this.last.next = node;
    this.last = node;
  }
  return this;
};

// @returns  first child node of the current node
Node.prototype.firstChild = function() {
  if (_.isUndefined(this.first))
    return null;
  return this.first;
};

// @returns  next node of the current node
Node.prototype.getNext = function() {
  if (_.isUndefined(this.next))
    return null;
  return this.next;
};

// @returns  true if the current node have element following itself
Node.prototype.haveNext = function() {
  return !_.isUndefined(this.next);
};

// @returns  true if the current node have at least one child node
Node.prototype.haveChild = function() {
  return !_.isUndefined(this.first);
};

// @returns  number of all nodes contained in the nodes tree
Node.prototype.count = function() {
  var count = 1;
  if (this.haveChild())
    count += this.first.count();
  if (this.haveNext())
    count += this.next.count();
  return count;
};

function createTag(tag) {
  var node = new Node();
  node.tag = tag;
  return node;
}

function createText(text) {
  var node = new Node();
  node.text = text;
  return node;
}

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


function isOpening(tag) {
  if (tag.length < 1)
    return false;
  return tag[tag.length - 1] !== '*';
}


// var text = null;
// var single = ['p', 'v', 'c', 'q', 'b', 's'];
// var paired =  ['add', 'dc', 'nd', 'qt', 'wj'];
var paired  = /add|dc|nd|qt|wj/;

function isPaired(tag) {
  return paired.test(tag) === true;
}

function parse(file) {
  var vre = /(\\\+?(\w+)\*?)/gm;
  var str = fs.readFileSync(file, 'utf8');
  var node = new Node('');
  var cn = null;
  var stack = new Stack();
  var lastIndex = 0;
  stack.push(node);

  var arr = vre.exec(str);
  while (arr !== null) {
    cn = stack.top();

    var tag = arr[1];
    if (!isOpening(tag)) {
      stack.pop();
      cnode = stack.top();
    }
    else {
      var content = str.substring(lastIndex, arr.index);

      node = new Node(tag);
      console.log();
    }

    lastIndex = vre.lastIndex;
    arr = vre.exec(str);
  }
}


bids.forEach(function(bid) {
  dirNames.forEach(function(dn) {
    var file = findBook(cfg.bibleDir(dn).from, bid);
    if (file === null) {
      log.info('failed to find book with id: %s', bid);
      return;
    }

    log.info(file);
    parse(file);
  });

});


})();