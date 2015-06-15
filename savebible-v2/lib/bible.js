var fs   = require('fs');
var path = require('path');
var _    = require('lodash');
var util = require('util');

var help = require('./../helpers');

var log  = require('log4js').getLogger('bib');


function inherit(child, base, props) {
  child.prototype = _.create(base.prototype, _.assign({
    '_super': base.prototype,
    'constructor': child
  }, props));
  return child;
}


;(function() {
  'use strict';


  // all tags should be presented here
  var TAG = {
    H:    '\\h',       // Running header text.
    ID:   '\\id',      // File identification.
    IDE:  '\\ide',     // An optional character encoding specification.
    MT:   '\\mt',      // Major title.
    IS:   '\\is',      // Introduction section heading.
    TOC1: '\\toc1',    // Long table of contents text.
    TOC2: '\\toc2',    // Short table of contents text.
    TOC3: '\\toc3',    // Book abbreviation.

    C:    '\\c',       // Chapter number.
    V:    '\\v',       // Verse number.
    P:    '\\p',       // Normal paragraph.

    ADD:  '\\add',     // Translator's addition.
    WJ:   '\\wj',      // Words of Jesus.
    ND:   '\\nd',      // Name of God (name of Deity).
    QT:   '\\qt'       // Quoted text. Old Testament quotations in the New Testament
  };


  // ------------------------------------------------------------------------
  //                         TAG manipulation
  // ------------------------------------------------------------------------
  var TH = (function() {
    var supported  = /add|wj|nd|qt/;
    var translator = /add/;
    var jesusWord  = /wj/;

    return {
      isSupported: function(tag) {
        return supported.test(tag) !== false;
      },

      isOpening: function(tag) {
        return tag[tag.length - 1] !== '*';
      },

      isTranslator: function(tag) {
        return translator.test(tag) !== false;
      },

      isJesusWord: function(tag) {
        return jesusWord.test(tag) !== false;
      },

      // returns tag's name without special symbols (\wj -> wj, \+add -> add)
      // if the tag is not supported, the default value will be returned
      name: function(tag, def) {
        var d = def || 'unknown';
        var mt = tag.match(supported);
        if (mt !== null)
          return mt[0];
        return d;
      }
    };
  })();



  var Node = function(parent) {
    this.parent = parent;
  };

  Node.prototype.addChild = function(node) {
    this.nodes.push(node);
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

      createCompound: function(tag, parent) {
        var node = new Node(parent);
        node.tag = tag;
        node.nodes = [];
        return node;
      },

      createText: function(text, parent) {
        var node = new Node(parent);
        node.text = text;
        return node;
      },

      normalize: function(node) {
        var current = null;
        node.nodes.forEach(function(n) {
          if (NH.isCompound(n)) {
            current = null;
            NH.normalize(n);
          } else {
            if (current === null)
              current = n;
            else {
              current.text += n.text;
              n.text = '';
            }
          }
        });

        // now remove redundant nodes
        node.nodes = node.nodes.filter(function(n) {
          return !(NH.isText(n) && n.text === '');
        });
      }
    };
  })();


  var Verse = function() {
    this.parent = null;
    this.number = 0;
    this.node   = NH.createCompound('', null);
  };

  Verse.prototype.validate = function() {

  };


  var Chapter = function() {
    this.parent = null;
    this.number = 0;
    this.verses = [];
  };


  var Book = function() {
    this.parent   = null;
  };


  var Parser = function() {
    this.supportedOnly = false;
    this.vre = /(\\\+?(\w+)\*?)\s?/gm;

    // deal with child nodes
    var childTextNode = function (node, str, from, to) {
      var text = str.substring(from, to);
      if (text.length > 0) {
        node.addChild(NH.createText(text, node));
      }
    };

    this.parseVerseImpl = function(str, ind, arr, re, node) {
      if (arr !== null) {

        // collect the available text
        if (ind < arr.index && node !== null) {
          childTextNode(node, str, ind, arr.index);
        }

        var tag = arr[1];
        if (TH.isOpening(tag)) {
          var compundNode = NH.createCompound(tag, node);

          // collect supported tags
          if (this.supportedOnly === false) {
            node.addChild(compundNode);
          } else if (TH.isSupported(tag)) {
            node.addChild(compundNode);
          }

          ind = arr.index + arr[0].length;
          arr = re.exec(str);
          this.parseVerseImpl(str, ind, arr, re, compundNode);
        } else {
          // closing tag
          ind = arr.index + arr[1].length;
          arr = re.exec(str);

          // search for the first matched opening tag
          // remove last character as the current tag ends with symbol *
          tag = tag.slice(0, -1);
          while (node !== null && node.tag !== tag) {
            node = node.parent;
          }
          this.parseVerseImpl(str, ind, arr, re, node !== null ? node.parent : node);
        }
      } else {
        // collect remaining text
        if (ind < str.length && node !== null) {
          childTextNode(node, str, ind, str.length);
        }
      }
    };


    // helps to perform chapter parsing
    this.parseChapterImpl = function(str, chap) {
      var re = /((\\p)[\s\S]+?)?(\\v)(\s+)(\d+)/gm;
      var arr = null;
      var verseStart = 0,
        vstr = '',
        vn = '';
      var np = false;

      // find verses
      while (true) {
        arr = re.exec(str);
        if (arr === null) {
          vstr = str.substring(verseStart);
          vn = vn;
        } else {
          vstr = str.substring(verseStart, arr.index);
        }

        if (verseStart !== 0) {
          var v = this.parseVerse(vstr);
          v.number = parseInt(vn);
          v.np = np;
          chap.addVerse(v);
        }

        if (arr !== null) {
          np = false;
          vn = arr[5];
          if (arr[2] === TAG.P) {
            np = true;
          }
        }
        verseStart = re.lastIndex;
        if (arr === null)
          return;
      }
    };

    // helps to perform book parsing
    this.parseBookImpl = function(str, book) {
      var re = /\\c\s+(\d+)/gm;
      var arr = re.exec(str);
      var lastIndex = 0,
        cstr = '',
        cn = '';
      if (arr !== null) {
        var header = str.substring(0, arr.index);
        extractHeader(header, book);
        lastIndex = re.lastIndex;
        cn = arr[1];
      } else {
        throw 'Empty USFM book';
      }

      // find chapters
      while (true) {
        arr = re.exec(str);
        if (arr !== null)
          cstr = str.substring(lastIndex, arr.index);
        else
          cstr = str.substring(lastIndex);

        var c = this.parseChapter(cstr);
        c.parent = book;
        c.number = parseInt(cn);
        book.addChapter(c);

        if (arr === null)
          return;
        lastIndex = re.lastIndex;
        cn = arr[1];
      }
    };
  };


  Parser.prototype.parseVerse = function(str) {

    // get rid of CR (carriage return) character, and replace
    // LF (line feed) characters with space
    var tmp = str.replace(/\r/gm, '')
             .replace(/\n|¶/gm, ' ')
             .replace(/\s{2,}/gm, ' ')
             .trim();

    this.vre.lastIndex = 0;
    var arr = this.vre.exec(str);

    var verse = new Verse();
    this.parseVerseImpl(tmp, 0, arr, this.vre, verse.node);
    NH.normalize(verse.node);
    return verse;
  };


  Parser.prototype.parseChapter = function(str) {
    var chap = new Chapter();
    this.parseChapterImpl(str, chap);
    return chap;
  };


  Parser.prototype.parseBook = function(str) {
    if (typeof str !== 'string')
      throw 'parseBook expects a string argument';

    var book = new Book();
    this.parseBookImpl(str, book);
    return book;
  };


  var loadBook = function(file) {
    var parser = new Parser();
    var str = fs.readFileSync(file, 'utf8');
    var book = parser.parseBook(str);
    return book;
  };

  /**
   * Load bible books from the specified directory and construct bible object
   * @param  {string} dir directory containing usfm files
   * @return {object}     bible object
   */
  var loadBible = function(dir) {
    dir = path.normalize(dir + '/');
    var files = fs.readdirSync(dir, 'utf8');

    var bible = new Bible();
    files.forEach(function(file) {
      try {
        bible.addBook(loadBook(dir + file));
      }
      catch (e) {
        log.error('"%s" file processing failed. Error: %s', file, e);
      }
    });

    return bible;
  };



  var Renderer = function() {
  };

  // function renderNodeCommon(renderer, node) {
  //   var res = '';

  //   if (node.nodes === null)
  //     return res;

  //   // combine the result of child nodes
  //   node.nodes.forEach(function(n) {
  //     res += renderer.renderNode() n.render(renderer);
  //   });
  //   return res;
  // }

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
    if (NH.isText(node))
      return node.text;

    var that = this;
    var res = '';
    node.nodes.forEach(function(n) {
      res += that.renderNode(n);
    });

    if (node.tag === '')
      return res;
    return node.tag + ' ' + res + node.tag + '*';
  };

  Renderer.prototype.renderVerse   = function(verse)  {
    var prefix = '';
    if (verse.np === true)
      prefix = TAG.P + LF;
    return prefix + TAG.V + ' ' + verse.number + ' ' + this.renderNode(verse.node);
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


