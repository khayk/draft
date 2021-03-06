var idsmap = require('./idsmap.js');
var _      = require('underscore');
var cmn    = require('./common.js');

var padNumber = cmn.padNumber;

function extend(child, parent) {
  var FnObj = function() {};
  FnObj.prototype = parent.prototype;
  child.prototype = new FnObj();
  child.prototype.constructor = child;
  child.uber = parent.prototype;
}


// expected input reference is {ix: number, cn: chapter number, vn: verse number}
// output 8 bytes lenght string of for 'XXCCCVVV'
function encodeRef(decodedRef) {
  return padNumber(decodedRef.ix, 2) +
    padNumber(decodedRef.cn, 3) +
    padNumber(decodedRef.vn, 3);
}

// see encodeRef, this function performs opposite job of encodeRef
function decodeRef(encodedRef) {
  return {
    ix: parseInt(encodedRef.substr(0, 2)),
    cn: parseInt(encodedRef.substr(2, 3)),
    vn: parseInt(encodedRef.substr(5, 3))
  };
}


var LF = '\n'; // line feed
var CR = '\r'; // carriage return

// -----------------------------------------------------------------------
//                             BBMEntry
// -----------------------------------------------------------------------

var BBM_TYPE_OLD = 1;
var BBM_TYPE_NEW = 2;
var BBM_TYPE_ADD = 3;
var BBM_TYPE_SEC = 4;

var BBMEntry = function(id, index, abbr, type) {
  if (!type || type < BBM_TYPE_OLD || type > BBM_TYPE_SEC)
    throw 'invalid Bible book mapping entry type: ' + type;

  this.id = id;        // book unique id
  this.index = index;  // book order number
  this.abbr = abbr;    // book abbreviation
  this.type = type;    // 1 - old, 2 - new, 3 - additional
};

// -----------------------------------------------------------------------
//                   BBM (bible books mapping)
// -----------------------------------------------------------------------
var BBM = (function() {
  var instance_; // instance stores a reference to the Singleton

  function init() {
    var entries = [];
    var byId = {}; // sorted by id
    var byOn = {}; // sorted by order number (i.e. by index)

    idsmap.idsmap.forEach(function(e) {
      var obj = new BBMEntry(e.id, e.index, e.abbr, e.type);
      entries.push(obj);
    });

    // sort entries in by index
    entries.sort(function(x, y) {
      return x.index - y.index;
    });

    // initialize maps
    entries.forEach(function(e, i) {
      byId[e.id] = i;
      byOn[e.index] = i;
    });

    var advance = function(id, delta) {
      var ref = instance_.entryById(id);
      if (ref) {
        ref = instance_.entryByOn(ref.index + delta);
        if (ref)
          return ref.id;
      }
      return null;
    };

    return {
      // get an entry by given id
      entryById: function(id) {
        var ref = byId[id];
        if (_.isUndefined(ref))
          return null;
        return entries[ref];
      },

      // get entries by order number (i.e. by index)
      entryByOn: function(on) {
        var ref = byOn[on];
        if (_.isUndefined(ref))
          return null;
        return entries[ref];
      },

      // entries count
      numEntries: function() {
        return entries.length;
      },

      onById: function(id) {
        var ref = this.entryById(id);
        if (ref === null) {
          return 0;
        }
        return ref.index;
      },

      idByOn: function(on) {
        var ref = this.entryByOn(on);
        if (ref === null)
          return ref;
        return ref.id;
      },

      // check if entry with given id exists
      existsId: function(id) {
        if (_.isUndefined(byId[id]))
          return false;
        return true;
      },

      // return entries sorted by order number
      entries: function() {
        return entries;
      },

      // return ids collection
      ids: function() {
        return byId;
      },

      // return order numbers collection
      ons: function() {
        return byOn;
      },

      // @returns id that come after the entry with specified id,
      //          null if there are no more entries
      nextId: function(id) {
        return advance(id, 1);
      },

      // @returns id that stands before the entry with specified id.
      //          null returned if there are no more entries
      prevId: function(id) {
        return advance(id, -1);
      }
    };
  }

  return {
    instance: function() {
      if (!instance_) {
        instance_ = init();
      }
      return instance_;
    }
  };
})();


// ------------------------------------------------------------------------
//                              TOC item
// ------------------------------------------------------------------------
var TocItem = function(id, abbr, name, lname, desc) {
  // TODO - verify name presence
  this.id    = id.trim() || '';
  this.abbr  = abbr || '';
  this.name  = name.trim() || '';
  this.lname = lname || '';
  this.desc  = desc || '';

  // reuse default abbreviation of book for missing items
  if (this.abbr === '')
    this.abbr = BBM.instance().entryById(this.id).abbr;
  if (this.lname) {
    this.lname = this.lname.trim();
    // if after all long name is empty get the value from name
    if (this.lname === '')
      this.lname = this.name;
  }
  if (this.desc)
    this.desc = this.desc.trim();
};


TocItem.prototype.borrow = function(itm) {
  if (this.id !== itm.id)
    throw 'unable to borrow attributes from the source of different id';

  if (this.name === '')
    this.name = itm.name;
  if (this.lname === '')
    this.lname = itm.lname;
  if (this.desc === '')
    this.desc = itm.desc;
};


TocItem.prototype.verify = function() {
  if (this.id === '')
    throw 'missing id';
  if (this.abbr === '')
    throw 'missing abbr';
  if (this.name === '')
    throw 'missing name';
  if (this.lname === '')
    throw 'missing lname';
};


// ------------------------------------------------------------------------
//                      Table of content for Bible
// ------------------------------------------------------------------------
var TableOfContent = function() {
  var content = {};
  var size = 0;

  return {
    numItems: function() {
      return size;
    },

    addItem: function(itm) {
      if (!_.isUndefined(content[itm.id]))
        throw 'id ' + itm.id + ' already exists';
      content[itm.id] = itm;
      ++size;
    },

    getItem: function(id) {
      var itm = content[id];
      if (_.isUndefined(itm))
        return null;
      return itm;
    },

    firstItem: function() {
      var key = null;
      for (key in content) break;
      if (key)
        return this.getItem(key);
      return null;
    },

    nextItem: function(id) {
      var nid = id;
      while (nid) {
        nid = BBM.instance().nextId(nid);
        var itm = this.getItem(nid);
        if (itm)
          return itm;
      }
      return null;
    },

    prevItem: function(id) {
      var nid = id;
      while (nid) {
        nid = BBM.instance().prevId(nid);
        var itm = this.getItem(nid);
        if (itm)
          return itm;
      }
      return null;
    },

    haveItem: function(id) {
      return !_.isUndefined(content[id]);
    },

    // fill empty keys from input object
    borrow: function(toc) {
      _.each(content, function(val, key) {
        var ti = toc.getItem(key);
        if (ti !== null)
          val.borrow(ti);
      });
    },

    // verify that core attributes are presented in the table of content
    verify: function() {
      _.each(content, function(val, key) {
        val.verify();
      });
    }
  };
};


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
var Tags = (function() {
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


// ------------------------------------------------------------------------
//                      NODE - THE BASE CLASS
// ------------------------------------------------------------------------
var Node = function(parent) {
  this.parent = parent;
};

// ------------------------------------------------------------------------
var NH = (function() {
  return {
    isCompound: function(node) {
      if (typeof node.nodes !== 'undefined')
        return true;
      return false;
    },

    isText: function(node) {
      if (typeof node.text !== 'undefined')
        return true;
      return false;
    },
  };
})();

// ------------------------------------------------------------------------
//                             TEXT NODE
// ------------------------------------------------------------------------
var TextNode = function(text, parent) {
  Node.call(this, parent);
  this.text = text;
};
extend(TextNode, Node);

TextNode.prototype.render = function(renderer) {
  return this.text;
};


// ------------------------------------------------------------------------
//                             TAG NODE
// ------------------------------------------------------------------------
var CompoundNode = function(tag, parent) {
  Node.call(this, parent);
  this.tag   = tag;
  this.nodes = [];
};
extend(CompoundNode, Node);

CompoundNode.prototype.addChild = function(node) {
  this.nodes.push(node);
};

CompoundNode.prototype.render = function(renderer) {
  return renderer.renderNode(this);
};

CompoundNode.prototype.normalize = function() {
  var current = null;
  this.nodes.forEach(function(n) {
    if (NH.isCompound(n)) {
      current = null;
      n.normalize();
    }
    else {
      if (current === null)
        current = n;
      else {
        current.text += n.text;
        n.text = '';
      }
    }
  });

  // now remove redundant nodes
  this.nodes = this.nodes.filter(function(n) {
    return !(NH.isText(n) && n.text === '');
  });
};


// ------------------------------------------------------------------------
//                               VERSE
// ------------------------------------------------------------------------
var Verse = function() {
  this.parent = null;
  this.number = 0;
  this.np     = false; // new paragraph
  this.node   = new CompoundNode('', null);
};

Verse.prototype = {
  // construct id that will uniquely identify verse in the scope of
  // the whole bible
  id: function() {
    if (this.parent === null) {
      return 'null 0: ' + this.number;
    }
    return this.parent.id() + ':' + this.number;
  },

  // get reference {ix: book unchangable index, cn: chapter number, vn: verse number}
  ref: function() {
    if (this.parent === null) {
      return {ix: 0, cn: 0, vn: this.vn()};
    }
    var t = this.parent.ref();
    t.vn = this.vn();
    return t;
  },

  vn: function() {
    return this.number;
  },

  // retuns the chapter number that holds this verse, if no parent 0 returned
  cn: function() {
    if (this.parent)
      return this.parent.number;
    return 0;
  },

  // returns id of the book, that holds this verse, if no parent null returned
  bid: function() {
    if (this.parent)
      return this.parent.bid();
    return '';
  },

  // return the next verse of the chapter containing current verse
  next: function() {
    if (this.parent)
      return this.parent.getVerse(this.number + 1);
    return null;
  },

  // return the previous verse of the chapter containing current verse
  prev: function() {
    if (this.parent)
      return this.parent.getVerse(this.number - 1);
    return null;
  },

  render: function(renderer) {
    return renderer.renderVerse(this);
  }
};

// ------------------------------------------------------------------------
//                               CHAPTER
// ------------------------------------------------------------------------
var Chapter = function() {
  this.parent = null;
  this.number = 0;
  this.verses = [];

  // the pair <verse index, heading>, where heading should be displayed
  // just above the verse with the 'verse index'
  this.heading = {};
};

Chapter.prototype = {
  id: function() {
    if (this.parent === null) {
      return 'null ' + this.number;
    }
    return this.parent.id + ' ' + this.number;
  },

  // get reference {ix: book unchangable index, cn: chapter number, vn: verse number}
  ref: function() {
    if (this.parent === null) {
      return {ix: 0, cn: this.number, vn: 0};
    }
    var t = this.parent.ref();
    t.cn = this.number;
    return t;
  },

  // return book id containing current verse
  bid: function() {
    if (this.parent) {
      return this.parent.id;
    }
    return '';
  },

  // return the next chapter in the book containing current chapter
  // return null there are no more
  next: function() {
    if (this.parent)
      return this.parent.getChapter(this.number + 1);
    return null;
  },

  // return the previous chapter in the book containing current chapter
  // return null there are no more
  prev: function() {
    if (this.parent)
      return this.parent.getChapter(this.number - 1);
    return null;
  },

  numVerses: function() {
    return this.verses.length;
  },

  // insert verse into chapter, throw exception if something went wrong
  addVerse: function(verse) {
    verse.parent = this;
    if (verse.number <= this.numVerses())
      throw 'Attempt to overwrite existing verse ' + verse.id();

    if ( verse.number - this.numVerses() !== 1 ) {
      console.warn('detected verse gap while adding verse ' + verse.id());
      while (verse.number - this.numVerses() > 1) {
        // add empty verses to fill gap
        var dummy = new Verse();
        dummy.parent = this;
        dummy.number = this.numVerses() + 1;
        this.verses.push(dummy);
      }
    }
    this.verses.push(verse);
    return this;
  },

  getVerse: function(number) {
    if (number > this.numVerses() || number < 1) {
      return null;
    }
    return this.verses[number - 1];
  },

  addHeading: function(text) {
    var loc = this.verses.length;
    if (_.isUndefined(this.heading[loc]))
      this.heading[loc] = [];
    this.heading[loc].push(text);
  },

  render: function(renderer) {
    return renderer.renderChapter(this);
  }
};


// ------------------------------------------------------------------------
//                               BOOK
// ------------------------------------------------------------------------
var Book = function() {
  this.parent   = null;
  this.index    = 0;    // predefined index from idsmap, unchangeble value
  this.id       = '';
  this.abbr     = '';
  this.name     = '';
  this.lname    = '';
  this.desc     = '';
  this.chapters = [];
  this.preface  = [];
};

Book.prototype = {

  // get reference {ix: book unchangable index, cn: chapter number, vn: verse number}
  ref: function() {
    return {ix: this.index, cn: 0, vn: 0};
  },

  // return the next book of the bible
  // return null there are no more
  next: function() {
    if (this.parent) {
      var tocItem = this.parent.getToc().nextItem(this.id);
      if (tocItem)
        return this.parent.getBook(tocItem.id);
    }
    return null;
  },

  // return the previous book of the bible
  // return null there are no more
  prev: function() {
    if (this.parent) {
      var tocItem = this.parent.getToc().prevItem(this.id);
      if (tocItem)
        return this.parent.getBook(tocItem.id);
    }
    return null;
  },

  numChapters: function() {
    return this.chapters.length;
  },

  addChapter: function(chapter) {
    chapter.parent = this;
    if ( chapter.number - this.numChapters() !== 1 ) {
      throw 'detected chapter gap while adding ' + chapter.id();
    }
    this.chapters.push(chapter);
    return this;
  },

  getChapter: function(number) {
    if (number < 1 || number > this.numChapters())
      return null;
    return this.chapters[number - 1];
  },

  render: function(renderer) {
    return renderer.renderBook(this);
  }

  // getVerse: function(cn, vn) {
  //   if (cn > this.chapters.length || cn < 1)
  //     throw 'invalid chapter for book \"' + this.id + '\": [' + cn + '/' + this.chapters.length + ']';
  //   return this.chapters[cn - 1].getVerse(vn);
  // }
};


var Bible = function() {
  this.ids     = {};
  this.books   = [];
  this.abbr    = '';
  this.name    = '';
  this.desc    = '';
  this.year    = '';
  this.lang    = '';
  this.toc     = new TableOfContent();
};

Bible.prototype.render = function(renderer) {
  return renderer.renderBible(this);
};

Bible.prototype.sort = function() {
  this.books.sort(function(x, y) {
    return BBM.instance().entryById(x.id).index - BBM.instance().entryById(y.id).index;
  });

  var self = this;
  this.books.forEach(function(b, i) {
    self.ids[b.id] = i;
  });
};

// returns books count in the bible
Bible.prototype.numBooks = function() {
  return this.books.length;
};

// add book into bible if it is not added already. duplicate book insertion
// will raise an exception
Bible.prototype.addBook = function(book) {
  // make sure that the new book is not exist in the instance of bible
  if (!_.isUndefined(this.ids[book.id]))
    throw 'book ' + book.id + ' is already exist in the bible';

  book.parent = this;
  this.books.push(book);
  this.ids[book.id] = this.books.length - 1;
  this.toc.addItem(new TocItem(book.id,
                               book.abbr,
                               book.name,
                               book.lname,
                               book.desc));
  return this;
};

Bible.prototype.getBook = function(id) {
  var ref = this.ids[id];
  if (_.isUndefined(ref))
    return null;
  return this.books[ref];
};

Bible.prototype.getToc = function() {
  return this.toc;
};

// ------------------------------------------------------------------------
//                            PARSER BASE
// ------------------------------------------------------------------------
var Parser = function() {};
// Parser.prototype.parseVerse   = function(str) { throw 'implement parser'; };
// Parser.prototype.parseChapter = function(str) { throw 'implement parser'; };
// Parser.prototype.parseBook    = function(str) { throw 'implement parser'; };
// Parser.prototype.parseBible   = function(arr) { throw 'implement parser'; };


// ------------------------------------------------------------------------
//                            USFM PARSER
// ------------------------------------------------------------------------
var USFMParser = function(supportedOnly) {
  this.supportedOnly = supportedOnly;
  this.vre =  /(\\\+?(\w+)\*?)\s?/gm; // verse parsing regexp

  // deal with child nodes
  var childTextNode = function (node, str, from, to) {
    var text = str.substring(from, to);
    if (text.length > 0)
      node.addChild(new TextNode(text, node));
  };

  var extractHeader = function(header, book) {
    // extract book headers
    var re = /(\\\w+)\s+(.*)/gm;
    var arr = null;
    while ((arr = re.exec(header)) !== null) {
      var tag = arr[1];
      var str = arr[2];
      if (tag === TAG.ID) {
        arr = /(\w+)\s+(.+)/gm.exec(str);
        if (arr === null)
          throw 'failed to identify book id';
        book.id = arr[1];
        book.name = arr[2];
      }
      else {
        if (tag.indexOf(TAG.MT) !== -1 || tag === TAG.TOC1) {
          book.desc = str.trim();
        }
        else if (tag === TAG.TOC2 || tag === TAG.H) {
          book.name = str.trim();
        }
        else if (tag === TAG.TOC3) {
          book.abbr = str.trim();
        }
        else if (tag === TAG.IDE) {
          if (str !== 'UTF-8')
            console.warn('unknown encoding %s in %s book.', str, book.id);
        }
        else {
          if (tag.indexOf(TAG.IS) === -1)
            console.warn('unknown tag \"%s\" in \"%s\" book.', tag, book.id);
        }
      }
    }

    var tmp = BBM.instance().entryById(book.id);
    book.index = tmp.index;
    if (!BBM.instance().existsId(book.id))
      throw 'Invalid book id: ' + book.id;
    if (book.abbr === '')
      book.abbr = tmp.abbr;
  };

  // helps to perform verse parsing
  // parses str in USFM format and fill node object as an output
  this.parseVerseHelper = function (str, ind, arr, re, node) {
    if (arr !== null) {

      // collect the available text
      if (ind < arr.index && node !== null) {
        childTextNode(node, str, ind, arr.index);
      }

      var tag = arr[1];
      if (Tags.isOpening(tag)) {
        var compoundNode = new CompoundNode(tag, node);

        // collect supported tags
        if (this.supportedOnly === false) {
          node.addChild(compoundNode);
        } else if (Tags.isSupported(tag)) {
          node.addChild(compoundNode);
        }

        ind = arr.index + arr[0].length;
        arr = re.exec(str);
        this.parseVerseHelper(str, ind, arr, re, compoundNode);
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
        this.parseVerseHelper(str, ind, arr, re, node !== null ? node.parent : node);
      }
    } else {
      // collect remaining text
      if (ind < str.length && node !== null) {
        childTextNode(node, str, ind, str.length);
      }
    }
  };

/*
  // helps to perform verse parsing
  // parses str in USFM format and fill node object as an output
  this.parseVerseHelper = function (str, ind, arr, re, xnode) {
    var stack = [], node = null;
    stack.push(xnode);

    while (true) {
      node = stack[stack.length - 1];
      if (arr !== null) {
        // collect the available text
        if (ind < arr.index && node !== null) {
          childTextNode(node, str, ind, arr.index);
        }

        var tag = arr[1];
        if (Tags.isOpening(tag)) {
          var compoundNode = new CompoundNode(tag, node);

          // collect supported tags
          if (this.supportedOnly === false) {
            node.addChild(compoundNode);
          } else if (Tags.isSupported(tag)) {
            node.addChild(compoundNode);
          }

          ind = arr.index + arr[0].length;
          arr = re.exec(str);
          stack.push(compoundNode);
        } else {
          // closing tag
          ind = arr.index + arr[1].length;
          arr = re.exec(str);
          stack.pop();
        }
      } else {
        // collect remaining text
        if (ind < str.length && node !== null) {
          childTextNode(node, str, ind, str.length);
        }
        return;
      }
    }
  };
*/

  // helps to perform chapter parsing
  this.parseChapterHelper = function(str, chap) {
    var re = /((\\p)[\s\S]+?)?(\\v)(\s+)(\d+)/gm;
    var arr = null;
    var verseStart = 0, vstr = '', vn = '';
    var np = false;

    // find verses
    while (true) {
      arr = re.exec(str);
      if (arr === null) {
        vstr = str.substring(verseStart);
        vn = vn;
      }
      else {
        vstr = str.substring(verseStart, arr.index);
      }

      if (verseStart !== 0) {
        var v    = this.parseVerse(vstr);
        v.number = parseInt(vn);
        v.np     = np;
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
  this.parseBookHelper = function(str, book) {
    var re = /\\c\s+(\d+)/gm;
    var arr = re.exec(str);
    var lastIndex = 0, cstr = '', cn = '';
    if (arr !== null) {
      var header = str.substring(0, arr.index);
      extractHeader(header, book);
      lastIndex = re.lastIndex;
      cn = arr[1];
    }
    else {
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
extend(USFMParser, Parser);

USFMParser.prototype.parseVerse = function(str) {
  // get rid of CR (carriage return) character, and replace
  // LF (line feed) characters with space
  str = str.replace(/\r/gm, '')
           .replace(/\n|¶/gm, ' ')
           .replace(/\s{2,}/gm, ' ')
           .trim();

  this.vre.lastIndex = 0;
  var arr            = this.vre.exec(str);
  var verse          = new Verse();
  this.parseVerseHelper(str, 0, arr, this.vre, verse.node);
  verse.node.normalize();
  return verse;
};

USFMParser.prototype.parseChapter = function(str) {
  var chap = new Chapter();
  this.parseChapterHelper(str, chap);
  return chap;
};

USFMParser.prototype.parseBook = function(str) {
  if (typeof str !== 'string')
    throw 'parseBook expects a string argument';

  var book = new Book();
  this.parseBookHelper(str, book);
  return book;
};

// @param  arr     each array item holds information about single book of Bible
//                 array of objects of type {name: filename, content: strings}
// @param  details [optional] - contain book details
USFMParser.prototype.parseBible = function(arr, details) {
  if (!(arr instanceof Array))
    throw 'parseBible expects an array of strings';

  var bible = new Bible();
  var self = this;

  arr.forEach(function(obj) {
    try {
      // parse each book separately
      var book = self.parseBook(obj.data);
      bible.addBook(book);
    }
    catch (e) {
      console.error('"%s" file processing failed. Error: %s', obj.name, e);
    }
  });

  // append attributes
  if (details !== null && details !== undefined) {
    bible.format = details.format;
    bible.abbr   = details.abbr;
    bible.name   = details.name;
    bible.desc   = details.desc;
    bible.year   = details.year;
    bible.lang   = details.lang;

    var tmp = details.toc || [];
    var tmpTOC = new TableOfContent();
    tmp.forEach(function(ta) {
      tmpTOC.addItem(new TocItem(ta.id,
                            ta.abbr,
                            ta.name,
                            ta.lname,
                            ta.desc));
    });
    bible.toc.borrow(tmpTOC);
  }

  return bible;
};


// ------------------------------------------------------------------------
//                            TEXT PARSER
// ------------------------------------------------------------------------
var TextParser = function() {
  USFMParser.call(this, false);
};
extend(TextParser, USFMParser);

TextParser.prototype.parseVerse = function(str) {
  var tmp = str.replace(/\[/gm, '\\add ').replace(/\]/gm, '\\add*');
  return USFMParser.prototype.parseVerse.call(this, tmp);
};


// ------------------------------------------------------------------------
//                             PARSER FACTORY
// ------------------------------------------------------------------------
var ParserFactory = (function() {
  var usfmParser = null;
  var txtParser = null;

  return {
    createParser: function(format) {
      if (_.isUndefined(format))
        throw 'format is undefined';

      if (format === 'txt') {
        if (txtParser === null)
          txtParser = new TextParser();
        return txtParser;
      } else if (format === 'usfm') {
        if (usfmParser === null)
          usfmParser = new USFMParser(true);
        return usfmParser;
      } else
        throw 'unknown format: ' + format;
    }
  };
})();


// ------------------------------------------------------------------------
//                             RENDERER
// ------------------------------------------------------------------------
var Renderer = function() {
};

// Renderer.prototype.renderNode    = function(node)    { throw 'implement node renderer'; };
// Renderer.prototype.renderVerse   = function(verse)   { throw 'implement verse renderer'; };
// Renderer.prototype.renderChapter = function(chapter) { throw 'implement chapter renderer'; };
// Renderer.prototype.renderBook    = function(book)    { throw 'implement book renderer'; };
// Renderer.prototype.renderBible   = function(bible)   { throw 'implement bible renderer'; };

function renderNodeCommon(renderer, node) {
  var res = '';

  if (node.nodes === null)
    return res;

  // combine the result of child nodes
  node.nodes.forEach(function(n) {
    res += n.render(renderer);
  });
  return res;
}

Renderer.prototype.renderBible = function(bible) {
  var res = '';
  var self = this;

  bible.books.forEach(function(b) {
    if (res !== '')
      res += LF;
    res += b.render(self);
  });
  return res;
};


// ------------------------------------------------------------------------
//                           USFM RENDERER
// ------------------------------------------------------------------------
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
  if (verse.np === true)
    prefix = TAG.P + LF;
  return prefix + TAG.V + ' ' + verse.number + ' ' + verse.node.render(this);
};

USFMRenderer.prototype.renderChapter = function(chapter) {
  var res = TAG.C + ' ' + chapter.number;
  var self = this;
  chapter.verses.forEach(function(v) {
    res += LF + v.render(self);
  });
  return res;
};

USFMRenderer.prototype.renderBook = function(book) {
  var res = '';
  res += TAG.ID   + ' ' + book.id   + ' ' + book.name + LF;
  res += TAG.H    + ' ' + book.name + LF;
  res += TAG.TOC1 + ' ' + book.desc + LF;
  res += TAG.TOC2 + ' ' + book.name + LF;
  res += TAG.TOC3 + ' ' + book.abbr + LF;
  res += TAG.MT   + ' ' + book.desc;
  var self = this;
  book.chapters.forEach(function(c) {
    res += LF + c.render(self);
  });
  return res;
};


// ------------------------------------------------------------------------
//                           TEXT RENDERER
// ------------------------------------------------------------------------
var TextRenderer = function(options) {
  if (!options)
    options = { textOnly: true, useAbbr: false };
  else if (typeof options !== 'object')
    throw new TypeError('Bad arguments');
  this.textOnly = options.textOnly;
  this.useAbbr  = options.useAbbr;
};

extend(TextRenderer, Renderer);
TextRenderer.prototype.renderNode = function(node) {
  var res = '';
  if (node.parent !== null &&
      NH.isCompound(node) &&
      !Tags.isSupported(node.tag) ) {
    return res;
  }
  // if (_.isUndefined(node.parent) &&
  //     NH.isCompound(node) &&
  //     !Tags.isSupported(node.tag) ) {
  //   return res;
  // }

  res = renderNodeCommon(this, node);
  if (Tags.isTranslator(node.tag))
    return '[' + res + ']';
  return res;

/*  var res = ' ';
  var self = this;

  // combine the result of child nodes
  node.nodes.forEach(function(n) {
    var out = n.render(self);
    var prefix = ' ';
    switch (out[0]) {
      case '.':
      case ',':
      case ';':
      case ':':
      case '?':
      case '!':
        prefix = '';
        break;
    }
    if (res[res.length - 1] === '(')
        prefix = '';
    res += prefix + out;
  });

  if (node.tag.match(/add/g) === null)
    return res.trim();
  return '[' + res.trim() + ']';*/
};

TextRenderer.prototype.renderVerse = function(verse) {
  var res = '';
  if (!this.textOnly) {
    if (this.useAbbr)
      res = BBM.instance().entryById(verse.bid()).abbr + ' ' + verse.cn() + ':' + verse.vn();
    else
      res = verse.id();
    res += ' ';
  }
  res += verse.node.render(this);
  return res;
  //return verse.node.render(this).replace(/\s+/g, ' ').trim();
};

TextRenderer.prototype.renderChapter = function(chapter) {
  var res = '';
  var self = this;
  chapter.verses.forEach(function(v) {
    if (res.length !== 0)
      res += LF;
    res += v.render(self);
  });
  return res;
};

TextRenderer.prototype.renderBook = function(book) {
  var res = '';
  var self = this;
  book.chapters.forEach(function(c) {
    if (res.length !== 0)
      res += LF;
    res += c.render(self);
  });
  return res;
};



var BibleStats = function() {
  var tags = {};
  var nodesCount = 0;
  var verseCount = 0;
  var chapterCount = 0;
  var bookCount = 0;

  var clearMetrics = function() {
    tags = {};
    nodesCount = 0;
    verseCount = 0;
    chapterCount = 0;
    bookCount = 0;
  };

  var calcNTs = function(node) {
    ++nodesCount;
    if (NH.isCompound(node)) {
      // combine the result of child nodes
      node.nodes.forEach(function(n) {
        calcNTs(n);
      });

      var ref = node.tag;
      if (ref === '')
        return;
      if (_.isUndefined(tags[ref]))
        tags[ref] = 0;
      tags[ref]++;
    }
  };

  var calcVTs = function(verse) {
    calcNTs(verse.node);
    ++verseCount;
  };

  var calcCTs = function(chapter) {
    chapter.verses.forEach(function(v) {
      calcVTs(v);
    });
    ++chapterCount;
  };

  var calcBTs = function(book) {
    book.chapters.forEach(function(c) {
      calcCTs(c);
    });
    ++bookCount;
  };

  var calcBBTs = function(bible) {
    bible.books.forEach(function(b) {
      calcBTs(b);
    });
  };

  var reportResult = function() {
    console.log("\n\nDicovered %d tag(s)", Object.keys(tags).length);
    _.each(tags, function(val, key) {
      console.log("%s: %d", key, val);
    });
    console.log("\n\nNodes: %d", nodesCount);
    console.log("Verses: %d", verseCount);
    console.log("Chapters: %d", chapterCount);
    console.log("Books: %d\n\n", bookCount);
  };

  return {
    reset: clearMetrics,
    verseTags: calcVTs,
    chapterTags: calcCTs,
    bookTags: calcBTs,
    bibleTags: calcBBTs,
    report: reportResult
  };
};

// ------------------------------------------------------------------------
//                           EXPORTING
// ------------------------------------------------------------------------

exports.BBM            = BBM;
exports.Tags           = Tags;
exports.TableOfContent = TableOfContent;
exports.TocItem        = TocItem;

exports.Verse          = Verse;
exports.Chapter        = Chapter;
exports.Book           = Book;
exports.Bible          = Bible;

exports.Parser         = Parser;
exports.USFMParser     = USFMParser;
exports.TextParser     = TextParser;
exports.ParserFactory  = ParserFactory;

exports.Renderer       = Renderer;
exports.TextRenderer   = TextRenderer;
exports.USFMRenderer   = USFMRenderer;

exports.BibleStats     = BibleStats;
exports.CompoundNode   = CompoundNode;
exports.TextNode       = TextNode;

exports.encodeRef      = encodeRef;
exports.decodeRef      = decodeRef;




