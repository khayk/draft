var fs   = require('fs');
var path = require('path');
var _    = require('lodash');
var util = require('util');
var help = require('./../helpers');

var log  = require('log4js').getLogger('bib');

function functionName(fun) {
  var ret = fun.toString();
  ret = ret.substr('function '.length);
  ret = ret.substr(0, ret.indexOf('('));
  return ret;
}

// function extend(child, parent) {
//   var FnObj = function() {};
//   FnObj.prototype = parent.prototype;
//   child.prototype = new FnObj();
//   child.prototype.constructor = child;
//   child.uber = parent.prototype;
// }

function inherit(child, base, props) {
  child.prototype = _.create(base.prototype, _.assign({
    '_super': base.prototype,
    'constructor': child
  }, props));
  return child;
}

;(function() {
  'use strict';

  /**
   * Load bible books from the specified directory and construct bible object
   * @param  {string} dir directory containing usfm files
   * @return {object}     bible object
   */
  var loadBible = function(dir) {
    var totalSize = 0;
    dir = path.normalize(dir + '/');
    var files = fs.readdirSync(dir, 'utf8');
    files.forEach(function(file) {
      var buff = fs.readFileSync(dir + file);
      totalSize += buff.length;
      log.trace('file: %s, size: %s', file, help.bytesToSize(buff.length));
    });
    log.info('bible size: %s', help.bytesToSize(totalSize));
    return null;
  };


  var NH = (function() {
    return {
      isCompound: function(node) {
        if (!_.isUndefined(node.nodes))
          return true;
        return false;
      },

      isText: function(node) {
        if (!_.isUndefined(node.text))
          return true;
        return false;
      },

      normalize: function(node) {
        // if (NH.isCompound(node)) {
        //   var current = null;
        //   node.nodes.forEach(function(n) {
        //     if (NH.isCompound(n)) {
        //       current = null;
        //       n.normalize();
        //     }
        //     else {
        //       if (current === null)
        //         current = n;
        //       else {
        //         current.text += n.text;
        //         n.text = '';
        //       }
        //     }
        //   });

        //   // now remove redundant nodes
        //   node.nodes = node.nodes.filter(function(n) {
        //     return !(NH.isText(n) && n.text === '');
        //   });
        // }
      }
    };
  })();


  var Node = function(parent) {
    this.parent = parent;
  };


  var Verse = function() {
    this.parent = null;
    this.number = 0;
    this.node   = new Node(null);
  };

  Verse.prototype.validate = function() {

  };

  var Parser = function() {
    var reVerse = /(\\\+?(\w+)\*?)\s?/gm;
    this.parseVerseImpl = function(str, node) {

    };
  };

  Parser.prototype.parseVerse = function(str) {
    var verse = new Verse();
    this.parseVerseImpl(str, verse.node);
    NH.normalize(verse.node);
    return verse;
  };

  var Renderer = function() {
  };

  // These functions `SHOULD BE` overridden in the derived classes
  Renderer.prototype.renderOpenTag        = function(tag)   {};
  Renderer.prototype.renderCloseTag       = function(tag)   {};
  Renderer.prototype.renderOpenParagraph  = function(verse) {};
  Renderer.prototype.renderCloseParagraph = function(verse) {};
  Renderer.prototype.renderVerseNumber    = function(verse) {};
  Renderer.prototype.renderChapterNumber  = function(chap)  {};
  Renderer.prototype.renderBookHeader     = function(book)  {};

  // These functions `SHOULD NOT` be overridden in the derived classes
  Renderer.prototype.renderNode    = function(node)  {

  };

  Renderer.prototype.renderVerse   = function(verse)  {
    log.info('called Renderer::renderVerse');
  };

  Renderer.prototype.renderChapter = function(chapter) {

  };

  Renderer.prototype.renderBook    = function(book) {

  };

  Renderer.prototype.renderBible   = function(bible) {

  };


  var USFMRenderer = function() {
    Renderer.call(this);
  };
  inherit(USFMRenderer, Renderer);

  var TextRenderer = function() {
    Renderer.call(this);
  };
  inherit(TextRenderer, Renderer);


  exports.loadBible    = loadBible;
  exports.Verse        = Verse;
  exports.Parser       = Parser;

  exports.Renderer     = Renderer;
  exports.USFMRenderer = USFMRenderer;
  exports.TextRenderer = TextRenderer;



}.call(this));

require('../config').logFileLoading(__filename);


