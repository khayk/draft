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
var NL             = '\n';

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
var Book = function(bible, id) {
  this.parent   = null;
  this.id       = '';
  this.abbr     = '';
  this.name     = '';
  this.desc     = '';
  this.chapters = [];
};

Book.prototype.render = function(renderer) {
  return renderer.renderBook(this);
};

/// -----------------------------------------------------------------------
///                            PARSER BASE
/// -----------------------------------------------------------------------
var Parser = function() {};
Parser.prototype.parseVerse   = function(str) { throw 'implement parser'; };
Parser.prototype.parseChapter = function(str) { throw 'implement parser'; };
Parser.prototype.parseBook    = function(str) { throw 'implement parser'; };
Parser.prototype.parseBible   = function(arr) { throw 'implement parser'; };

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

  var extractHeader = function(header, book) {
  };

  /// helps to perform verse parsing
  /// parses str in USFM format and fill node object as an output
  this.parseVerseHelper = function (str, ind, arr, re, node) {
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
        this.parseVerseHelper(str, ind, arr, re, compoundNode);
      } else {
        // closing tag
        ind = arr.index + arr[1].length;
        arr = re.exec(str);

        /// search for the first matched openning tag
        /// remove last character as the currunt tag ends with symbol *
        tag = tag.slice(0, -1);
        while (node !== null && node.tag !== tag) {
          node = node.parent;
        }
        this.parseVerseHelper(str, ind, arr, re, node !== null ? node.parent : node);
      }
    } else {
      // collect remaining text
      if (ind < str.length && node !== null) {
        childTextNode(node, str, ind, str.length);
      }
    }
  };

  /// helps to perform chapter parsing
  this.parseChapterHelper = function(str, chap) {
    var re = /(\\[pv])(\s+)?(\d+)?/gm;
    var arr = null;
    var lastIndex = 0, vstr = '', vn = 0, np = false; // TODO:remove vn

    /// find verses
    while (true) {
      arr = re.exec(str);
      if (arr !== null)
        vstr = str.substring(lastIndex, arr.index);
      else
        vstr = str.substring(lastIndex);

      //vstr = vstr.trim();

      if (arr !== null) {
        console.log(vstr);

        if (arr[1] === '\\p') {
          np = true;
        }
        else if (arr[1] === '\\v') {
          vn = arr[3];
          var v = this.parseVerse(vstr);
          v.parent = chap;
          v.number = vn - 1;
          v.np     = np;
          chap.verses.push(v);
          np = false;
        }
      }

      lastIndex = re.lastIndex;
      if (arr === null) {
        return;
      }
    }
  };

  /// helps to perform book parsing
  this.parseBookHelper = function(str, book) {
    var re = /\\c\s+(\d+)/gm;
    var arr = re.exec(str);
    var lastIndex = 0, cstr = '', cn = 0;
    if (arr !== null) {
      var header = str.substring(0, arr.index);
      extractHeader(header, book);
      lastIndex = re.lastIndex;
      cn = arr[1];
    }

    /// find chapters
    while (true) {
      arr = re.exec(str);
      if (arr !== null)
        cstr = str.substring(lastIndex, arr.index);
      else
        cstr = str.substring(lastIndex);

      //console.log(cstr);
      var c = this.parseChapter(cstr);
      c.parent = book;
      c.number = cn;
      book.chapters.push(c);

      if (arr === null)
        return;
      lastIndex = re.lastIndex;
      cn = arr[1];
    }
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
  return chap;
};

USFMParser.prototype.parseBook = function(str) {
  var book = new Book();
  this.parseBookHelper(str, book);
  return book;
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

Renderer.prototype.renderNode    = function(node)    { throw 'implement node renderer'; };
Renderer.prototype.renderVerse   = function(verse)   { throw 'implement verse renderer'; };
Renderer.prototype.renderChapter = function(chapter) { throw 'implement chapter renderer'; };
Renderer.prototype.renderBook    = function(book)    { throw 'implement book renderer'; };
Renderer.prototype.renderBible   = function(bible)   { throw 'implement bible renderer'; };

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

USFMRenderer.prototype.renderNode = function(node) {
  var res = renderNodeCommon(this, node);
  if (node.tag === '')
    return res;
  return node.tag + ' ' + res + node.tag + '*';
};

USFMRenderer.prototype.renderVerse = function(verse) {
  var prefix = '';
  if (verse.np)
    prefix = '\\p' + NL;
  return prefix + '\\v ' + verse.number + verse.node.render(this);
};

USFMRenderer.prototype.renderChapter = function(chapter) {
  var res = '\\c ' + chapter.number;
  var self = this;
  chapter.verses.forEach(function(v) {
    res += NL + v.render(self);
  });
  return res;
};

USFMRenderer.prototype.renderBook = function(book) {
  var res = '';
  res += '\\id ' + book.id + ' ' + book.name + NL;
  res += '\\h '  + book.name + NL;
  res += '\\toc1 ' + book.desc + NL;
  res += '\\toc2 ' + book.name + NL;
  res += '\\toc3 ' + book.abbr + NL;
  res += '\\mt '   + book.desc;
  var self = this;
  book.chapters.forEach(function(c) {
    res += NL + c.render(self);
  });
  return res;
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
