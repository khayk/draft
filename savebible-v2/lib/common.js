;(function() {
  'use strict';

  var _ = require('lodash');

  // Constants for line ending
  var LF   = '\n';                    // line feed
  var CR   = '\r';                    // carriage return
  var CRLF = '\r\n';
  var NL   = CRLF;

  /*------------------------------------------------------------------------*/

  // all tags should be presented here
  var TAG = {
    H:    'h',       // Running header text.
    ID:   'id',      // File identification.
    IDE:  'ide',     // An optional character encoding specification.
    MT:   'mt',      // Major title.
    MS:   'ms',      // Major section heading
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
    var known      = /add|wj|nd|qt|dc|p|q|c|v/;
    var valid      = /\\\+?(\w+)\*?/;
    var ignored    = /^(zw|zws|zx|zwm|f)$/;


    var translator = /add/;
    var jesusWord  = /wj/;
    //var addition   = /dc/;

    // var single     = /^(p|b|q\d+|c|v|d)$/;

    // tags that do have a closing pair
    var paired     = /add|wj|nd|qt|dc|zw|f|zws|zx|zwm|ior|tl/;

    var discovered = {};

    // here are presented almost all tags of usfm language
    // @todo:hayk  construct list of paired tag automatically
    var identifications = /^(id|ide|sts|rem|h|toc\d)$/;
    var title           = /^(mt|mte|ms|mr|s|r|d)$/;
    var chapOrVerse     = /^(c|v)$/;
    var paragraphs      = /^(p|m)$/;
    var poetry          = /^(q\d?|b)$/;
    var footnotes       = /^(f|fr|fk|fq|fqa|fl|fp|fv|ft|fcd|fm)$/;
    var crossReference  = /^(x)$/;
    var specialText     = /^(add|nd|pn|qt|wj)$/;
    var styling         = /^(em|bd|it|bdit|no|sc)$/;

    var arrayIgnoredTags = ['zw', 'zws', 'zx', 'zwm', 'f'];

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
        return TAG.ADD === tag;
        //return translator.test(tag) === true;
      },

      // @returns   true for tags identifying Jesus Words
      isJesusWord: function(tag) {
        return jesusWord.test(tag) === true;
      },

      // @returns   true for tags identifying book
      isBookIdentification: function(tag) {
        return identifications.test(tag) === true;
      },

      // @returns   true for tags represents title tag
      isTitle: function(tag) {
        return title.test(tag) === true;
      },

      // @returns   true for addition tags
      // isAddition: function(tag) {
      //   return addition.test(tag) === true;
      // },

      // @return true if the the tag can contain inside the children the tag
      //              with the same name, otherwise returns false
      isSelfContained: function(tag) {
        switch (tag) {
          case TAG.ADD:
          case TAG.WJ:
          case TAG.ND:
          case TAG.QT:
            return true;
        }
        return false;
      },

      // @returns   true if tag should be completed with closing tag, otherwise false
      haveClosing: function(tag) {
        return paired.test(tag) === true;
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
      },

      // @returns  array containing predefined ignored tags
      arrayIgnored: function() {
        return arrayIgnoredTags;
      }
    };
  })();


  /*------------------------------------------------------------------------*/

  var haveParent = false;

  // Node base class, all verses stored as nodes in a tree like structure
  var Node = function() {
    if (haveParent)
      this.parent = 0;
  };

  // @param {object} node  object that is going to become child
  // @return this
  Node.prototype.addChild = function(node) {
    if (!this.isTag())
      throw new Error('Only tag node can have child nodes');

    if (this.firstChild() === null) {
      this.first = node;
      this.last  = node;
    }
    else {
      this.last.next = node;
      this.last = node;
    }
    if (haveParent)
      node.parent = this;
    return this;
  };

  // @peram {object} node  object that is goint to become the only child
  // @return this
  Node.prototype.setChild = function(node) {
    if (!this.isTag())
      throw new Error('Only tag node can have child nodes');

    this.first = node;
    this.last  = node;
    if (haveParent)
      node.parent = this;
    return this;
  };

  // @returns  first child node of the current node
  Node.prototype.firstChild = function() {
    if (_.isUndefined(this.first))
      return null;
    return this.first;
  };

  // @returns  last child node of the current node
  Node.prototype.lastChild = function() {
    if (_.isUndefined(this.last))
      return null;
    return this.last;
  };

  // @returns  true if the current node have at least one child node
  Node.prototype.haveChild = function() {
    return !_.isUndefined(this.first);
  };

  // @param {object} node  object that is going to become a next node of
  //                       current node
  // @return this
  Node.prototype.setNext = function(node) {
    if (this.haveNext())
      node.next = this.getNext();
    this.next = node;
    if (haveParent)
      node.parent = this.parent;
    return this;
  };

  // @returns  next node of the current node
  Node.prototype.getNext = function() {
    if (_.isUndefined(this.next))
      return null;
    return this.next;
  };

  // @returns  true if the current node have element following itself
  Node.prototype.haveNext = function() {
    return !_.isUndefined(this.next) && this.next !== null;
  };

  // @returns  true for nodes representing usfm tag, otherwise false
  Node.prototype.isTag = function() {
    if (_.isUndefined(this.tag))
      return false;
    return true;
  };

  // @returns  true for nodes representing text, otherwise false
  Node.prototype.isText = function() {
    if (_.isUndefined(this.text))
      return false;
    return true;
  };

  // @returns  number of all nodes contained in the nodes tree
  Node.prototype.count = function() {
    var count = 1;
    if (this.haveChild() )
      count += this.first.count();
    if (this.haveNext())
      count += this.next.count();
    return count;
  };

  // @brief  enumerate all child nodes of current node and call specified
  //         callback for each tag.
  // @param {bool} recursive   set false to enumerate only child nodes without
  //                           sub-children nodes. true value will result
  //                           enumeration of all nodes with sub children
  Node.prototype.enum = function(recursive, callback) {
    if (!this.isTag())
      throw new Error('Unable to enumerate non-tag node');
    var child = this.firstChild();
    while (child !== null) {
      if (child.isTag()) {
        callback(child);
        if (recursive)
          child.enum(recursive, callback);
      }
      child = child.getNext();
    }
  };

  // @brief  find all nodes with specified tag in whole subtree of the
  //         current node and keep results in the res array
  // @param {string} tag   search-able tag
  // @param {array}  res   array to hold resulted nodes
  Node.prototype.find = function(tag, res) {
    if (!this.isTag())
      throw new Error('Unable to search in a non-tag node');
    if (!_.isString(tag))
      throw new Error('Expecting string type for tag');

    var child = this.firstChild();
    while (child !== null) {
      if (child.isTag()) {
        if (child.tag === tag) {
          res.push(child);
          if (TH.isSelfContained(tag))
            child.find(tag, res);
        }
        else {
          child.find(tag, res);
        }
      }
      child = child.getNext();
    }
  };

  // @brief  normalize tree structure by eliminating nodes that can be merged
  //         into one
  Node.prototype.normalize = function() {
    if (!this.haveChild())
      return;

    var n = this.first, current = null;
    while (n !== null) {
      if (n.isTag()) {
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
      if (n.isText() && n.text === '') {
        if (n.haveNext()) {
          prev.next = n.getNext();
        }
      }
      else {
        if (n.isText())
          n.text = n.text.replace(/\s{2,}/gm, ' ');
        prev = n;
      }
      n = n.getNext();
    }
  };


  var NH = (function() {
    return {
      // getValue: function(node, attr, def) {
      //   var ref = node[attr];
      //   if (_.isUndefined(ref))
      //     return def;
      //   return ref;
      // },

      //@returns  first child node if it does exists and is a text node,
      //          otherwise null
      textChild: function(node) {
        var child = node.firstChild();
        if (child !== null && child.isText()) {
          return child;
        }
        return null;
      },

      // @return true if the specified node contain number attribute
      haveNumber: function(node) {
        if (_.isUndefined(node.number))
          return false;
        return true;
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