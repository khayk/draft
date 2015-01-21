getBibleRequireObj = (function (bibleGlobal) {
  var bibleRequire;

  if (typeof module !== 'undefined' && module.exports) {
    bibleGlobal  = global;
    bibleRequire = exports;
  } else {
    bibleRequire = bibleGlobal.bibleRequire = bibleGlobal.bibleRequire || {};
  }

  function getBibleRequire() {
    return bibleRequire;
  }

  return getBibleRequire;
})(this);


function extend(child, parent) {
  var FnObj = function() {};
  FnObj.prototype = parent.prototype;
  child.prototype = new FnObj();
  child.prototype.constructor = child;
  child.uber = parent.prototype;
}

var Tags = function() {
  // \qt  - Quoted text.
  //        Old Testament quotations in the New Testament
  // \add - Translator's addition.
  // \wj  - Words of Jesus.
  // \nd  - Name of God (name of Deity).
  this.coreTags = /add|wj|nd|qt/g;
  this.tags = {};
};

Tags.prototype = {
  isSupported: function(tag) {
    return (tag.match(this.coreTags) !== null);
  },

  isOpening: function(tag) {
    return tag[tag.length - 1] !== '*';
  },

  /// returns tag's name without special symbols (\wj -> wj, \+add -> add)
  /// if the tag is not supported, the default value will be returned
  name: function(tag, def) {
    var d = def || 'unknown';
    var mt = tag.match(this.coreTags);
    if (mt !== null)
      return mt;
    return d;
  }
};
var globalTags = new Tags();

/// -----------------------------------------------------------------------
///                      NODE - THE BASE CLASS
/// -----------------------------------------------------------------------
var NODE_TYPE_TEXT = 1;
var NODE_TYPE_TAG  = 2;

var Node = function(parent, type) {
  this.parent = parent;
  this.type   = type;
};

Node.prototype.addChild = function(node) {
  throw 'implement "addChild" in the derived class';
};

Node.prototype.render = function(renderer) {
  throw 'implement "render" in the derived class';
};

Node.prototype.type = function() {
  return this.type;
};

/// -----------------------------------------------------------------------
///                             TEXT NODE
/// -----------------------------------------------------------------------
var TextNode = function(text, parent) {
  Node.call(this, parent, NODE_TYPE_TEXT);
  this.text = text;
};
extend(TextNode, Node);
TextNode.prototype.render = function(renderer) {
  return this.text;
};

/// -----------------------------------------------------------------------
///                             TAG NODE
/// -----------------------------------------------------------------------
var CompoundNode = function(tag, parent) {
  Node.call(this, parent, NODE_TYPE_TAG);
  this.tag = tag;
  this.nodes = [];
};
extend(CompoundNode, Node);

CompoundNode.prototype.addChild = function(node) {
  this.nodes.push(node);
};

CompoundNode.prototype.render = function(renderer) {
  return renderer.renderNode(this);
};

/// -----------------------------------------------------------------------
///                               VERSE
/// -----------------------------------------------------------------------
var Verse = function(chapter, number) {
  this.parent = chapter || null;
  this.number = number || 0;
  this.np     = false; // new paragraph
  this.node   = new CompoundNode('', null);
};

Verse.prototype.render = function(renderer) {
  return renderer.renderVerse(this);
};

Verse.prototype.id = function() {
  if (this.parent !== null) {
    return this.parent.id() + ':' + this.number;
  }
  return 'null:' + this.number;
};


/// -----------------------------------------------------------------------
///                               CHAPTER
/// -----------------------------------------------------------------------
var Chapter = function(book, number) {
 this.parent = book || null;
 this.number = number || 0;
 this.verses = [];

 // the pair <verse index, heading>, where heading should be displayed
 // just above the verse with the 'verse index'
 this.heading = {};
};

Chapter.prototype.render = function(renderer) {
  return renderer.renderChapter(this);
};


/// -----------------------------------------------------------------------
///                               BOOK
/// -----------------------------------------------------------------------
function Book() {
  this.parent   = null;
  this.id       = '';
  this.abbr     = '';
  this.name     = '';
  this.desc     = '';
  this.chapters = [];
}


/// -----------------------------------------------------------------------
///                            PARSER BASE
/// -----------------------------------------------------------------------
var Parser = function() {};
Parser.prototype.parseBible   = function(arr) { throw 'implement parser'; };
Parser.prototype.parseBook    = function(str) { throw 'implement parser'; };
Parser.prototype.parseChapter = function(str) { throw 'implement parser'; };
Parser.prototype.parseVerse   = function(str) { throw 'implement parser'; };

/// -----------------------------------------------------------------------
///                            USFM PATSER
/// -----------------------------------------------------------------------
var USFMParser = function() {

  /// deal with child nodes
  var childTextNode = function (node, str, from, to) {
    var text = str.substring(from, to);
    if (text.length > 0)
      node.addChild(new TextNode(text, node));
  };

  /// parses str in USFM format and fill node object as an output
  var parseVerseImpl = function (str, ind, arr, re, node) {
    if (re === null) {
      re = /(\\\+?(\w+)\*?)\s?/gm;
      arr = re.exec(str);
      ind = 0;
    }

    if (arr !== null) {

      // collect the available text
      if (ind < arr.index && node !== null) {
        childTextNode(node, str, ind, arr.index);
      }

      var tag = arr[1];
      if (globalTags.isOpening(tag)) {
        var compoundNode = new CompoundNode(tag, node);

        // collect supported tags
        if (globalTags.isSupported(tag)) {
          node.addChild(compoundNode);
        }

        ind = arr.index + arr[0].length;
        arr = re.exec(str);
        parseVerseImpl(str, ind, arr, re, compoundNode);
      } else {
        // closing tag
        ind = arr.index + arr[1].length;
        arr = re.exec(str);
        parseVerseImpl(str, ind, arr, re, node.parent);
      }
    } else {
      // collect remaining text
      if (ind < str.length && node !== null) {
        childTextNode(node, str, ind, str.length);
      }
    }
  };

  /// helps to perform verse parsing through private methods
  this.parseVerseHelper = function(str, ind, arr, re, node) {
    parseVerseImpl(str, ind, arr, re, node);
  };

  /// helps to perform chapter parsing through private methods
  this.parseChapterHelper = function() {

  };
};
extend(USFMParser, Parser);

USFMParser.prototype.parseVerse = function(str) {
  var verse = new Verse();
  this.parseVerseHelper(str, 0, null, null, verse.node);
  return verse;
};

USFMParser.prototype.parseChapter = function(str) {
  var chap = new Chapter();
  this.parseChapterHelper(str, chap);
  // var verse = this.parseVerse(str);
  // verse.parent = chap;
  // verse.number = 1;
  // chap.verses[verse.number] = verse;
  return chap;
};

USFMParser.prototype.parseBook = function(str) {
  // var b = new Book();
  // var c = this.parseChapter(str);
};

/// object is expected to be an array of strings, each array item
/// represents a single book of Bible
USFMParser.prototype.parseBible = function(arr) {
};

/// -----------------------------------------------------------------------
///                             RENDERER
/// -----------------------------------------------------------------------
var Renderer = function() {
};

Renderer.prototype.renderBible   = function(bible)   { throw 'implement renderer'; };
Renderer.prototype.renderBook    = function(book)    { throw 'implement renderer'; };
Renderer.prototype.renderChapter = function(chapter) { throw 'implement renderer'; };
Renderer.prototype.renderVerse   = function(verse)   { throw 'implement renderer'; };
Renderer.prototype.renderNode    = function(node)    { throw 'implement renderer'; };

function renderNodeCommon(renderer, node) {
  var res = '';

  /// combine the result of child nodes
  node.nodes.forEach(function(n) {
    res += n.render(renderer);
  });
  return res;
}

// else if (options.renderMode == RENDER_HTML) {
//   if (this.tag === '')
//     return res;
//   return '<span class="' + getHtmlTag(this.tag) + '">' + res + '</span>';
// }
// return res;


/// -----------------------------------------------------------------------
///                           USFM RENDERER
/// -----------------------------------------------------------------------
var USFMRenderer = function() {
};
extend(USFMRenderer, Renderer);
USFMRenderer.prototype.renderVerse = function(verse) {
  return verse.node.render(this);
};

USFMRenderer.prototype.renderNode = function(node) {
  var res = renderNodeCommon(this, node);
  if (node.tag === '')
    return res;
  return node.tag + ' ' + res + node.tag + '*';
};


/// -----------------------------------------------------------------------
///                           TEXT RENDERER
/// -----------------------------------------------------------------------
var TextRenderer = function() {};
extend(TextRenderer, Renderer);
TextRenderer.prototype.renderVerse = function(verse) {
  return verse.node.render(this);
};

TextRenderer.prototype.renderNode = function(node) {
  return renderNodeCommon(this, node);
};


/// -----------------------------------------------------------------------
///                           EXPORTING
/// -----------------------------------------------------------------------
getBibleRequireObj().Verse        = Verse;
getBibleRequireObj().Chapter      = Chapter;
getBibleRequireObj().Book         = Book;

getBibleRequireObj().Parser       = Parser;
getBibleRequireObj().USFMParser   = USFMParser;

getBibleRequireObj().Renderer     = Renderer;
getBibleRequireObj().TextRenderer = TextRenderer;
getBibleRequireObj().USFMRenderer = USFMRenderer;
