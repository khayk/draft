;(function() {
  'use strict';

  var _ = require('lodash');

  // Constants for line ending
  var LF   = '\n';                    // line feed
  var CR   = '\r';                    // carriage return
  var CRLF = '\r\n';
  var NL   = LF;

  /*------------------------------------------------------------------------*/

  // all tags should be presented here
  var TAG = {
    H:    'h',       // Running header text.
    ID:   'id',      // File identification.
    IDE:  'ide',     // An optional character encoding specification.
    MT:   'mt',      // Major title.
    IS:   'is',      // Introduction section heading.
    TOC1: 'toc1',    // Long table of contents text.
    TOC2: 'toc2',    // Short table of contents text.
    TOC3: 'toc3',    // Book abbreviation.

    C:    'c',       // Chapter number.
    V:    'v',       // Verse number.
    P:    'p',       // Normal paragraph.

    Q:    'q',
    B:    'b',
    D:    'd',
    S:    's',
    R:    'r',
    IE:   'ie',
    IP:   'ip',

    ADD:  'add',     // Translator's addition.
    WJ:   'wj',      // Words of Jesus.
    ND:   'nd',      // Name of God (name of Deity).
    QT:   'qt'       // Quoted text. Old Testament quotations in the New Testament
  };


  // TAG manipulation
  var TH = (function() {
    var known      = /add|wj|nd|qt|dc/;
    var valid      = /\\\+?(\w+)\*?/;
    var ignored    = /zw|zws|zx|zwm/;
    var translator = /add/;
    var addition   = /dc/;
    var jesusWord  = /wj/;


    // tags that do not have a closing pair
    var single    = /^(p|b|q\d+|c|v|d)$/;
    var discovered = {};

    return {
      // @brief  build tag statistics, how many times that tag is found in the
      //         text that we are processing
      //
      // @param {string} tag  usfm tag
      onTag: function(tag) {
        var ref = discovered[tag];
        if (_.isUndefined(ref)) {
          discovered[tag] = {count: 1};
          return;
        }
        ref.count++;
      },

      // @param {string} tag  usfm tag, like this \tag, \+tag, \tag*
      // @returns             true if the specified tag is well know and
      //                      fully supported by the application,
      //                      otherwise false
      isKnown: function(tag) {
        return known.test(tag) === true;
      },

      // @returns   true for tags that are marked to be ignored
      isIgnored: function(tag) {
        return ignored.test(tag) === true;
      },

      // @param {string} tag  see above
      // @returns             true if the tag is not closing, i.e. ends with *
      isOpening: function(tag) {
        if (tag.length < 1)
          return false;
        return tag[tag.length - 1] !== '*';
      },

      // @returns   true for translator tags
      isTranslator: function(tag) {
        return translator.test(tag) === true;
      },

      // @returns   true for addition tags
      isAddition: function(tag) {
        return addition.test(tag) === true;
      },

      // @returns   true for tags identifying Jesus Words
      isJesusWord: function(tag) {
        return jesusWord.test(tag) === true;
      },

      // @returns   true if tag should be completed with closing tag, otherwise false
      haveClosing: function(tag) {
        return single.test(tag) === false;
      },

      // name of tag
      // @param  {string} tag tag string
      // @param  {string} def value to be returned, if tag is not supported
      // @return {string}     tag's name without special symbols (\wj -> wj,
      //                      \+add -> add)
      name: function(tag, def) {
        var d = def || 'unknown';
        var arr = valid.exec(tag);
        if (arr !== null)
          return arr[1];
        return d;
      },

      // @returns  an object containing all unique tags that are discovered
      //           during application run time
      discovered: function() {
        return discovered;
      }
    };
  })();


  /*------------------------------------------------------------------------*/


  // Node base class, all verses stored as nodes in a tree like structure
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

  // @brief  normalize tree structure by eliminating nodes that can be merged
  //         into one
  Node.prototype.normalize = function() {
    // if (!_.isUndefined(this.last))
    //   delete this.last;

    if (!this.haveChild())
      return;

    var n = this.first, current = null;
    while (n !== null) {
      if (NH.isTag(n)) {
        current = null;
        n.normalize();
      } else {
        if (current === null)
          current = n;
        else {
          current.text += n.text;
          n.text = '';
        }
      }
      n = n.getNext();
    }

    // now remove redundant nodes
    n = this.first;
    var prev = null;
    while (n !== null) {
      if (NH.isText(n) && n.text === '') {
        if (n.haveNext()) {
          prev.next = n.getNext();
        }
        // else {
        //   delete prev.next;
        // }
      }
      else {
        prev = n;
      }
      n = n.getNext();
    }
  };


  var NH = (function() {
    return {
      // @returns  true if the specified node contain usfm tag, otherwise false
      isTag: function(node) {
        if (!_.isUndefined(node.tag))
          return true;
        return false;
      },

      // @returns  true if the specified node is a text node
      isText: function(node) {
        if (!_.isUndefined(node.text))
          return true;
        return false;
      },

      // @param {string} tag  usfm tag of form \\tag, or \\+tag
      // @returns  new Node object that is contains specified tag
      createTag: function(tag) {
        var node = new Node();
        node.tag = tag;
        return node;
      },

      // @param {string} text
      createText: function(text) {
        var node = new Node();
        node.text = text;
        return node;
      }
    };
  })();


  exports.Node = Node;
  exports.TAG  = TAG;
  exports.TH   = TH;
  exports.NH   = NH;

  exports.NL   = NL;
  exports.CRLF = CRLF;
  exports.LF   = LF;
  exports.CR   = CR;

})();