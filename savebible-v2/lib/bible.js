var fs     = require('fs');
var path   = require('path');
var _      = require('lodash');
var util   = require('util');

var help   = require('./../helpers');
var idsmap = require('./idsmap.js');

var log    = require('log4js').getLogger('bib');


function inherit(child, base, props) {
  child.prototype = _.create(base.prototype, _.assign({
    '_super': base.prototype,
    'constructor': child
  }, props));
  return child;
}


(function() {
  'use strict';

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
    if (this.nodes === null)
      this.nodes = node;
    else {
      if (this.nodes.constructor !== Array) {
        var arr = [];
        arr.push(this.nodes);
        this.nodes = arr;
      }
      this.nodes.push(node);
    }
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
        node.nodes = null;
        return node;
      },

      createText: function(text, parent) {
        var node = new Node(parent);
        node.text = text;
        return node;
      },

      normalize: function(node) {
        if (node === null || node.nodes === null || NH.isText(node))
          return;

        var current = null;
        if (node.nodes.constructor === Array) {
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
        else {
          NH.normalize(node.nodes);
        }
      }
    };
  })();


  var Verse = function() {
    this.parent = null;
    this.number = 0;
    this.node   = NH.createCompound('', null);
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


  var Chapter = function() {
    this.parent = null;
    this.number = 0;
    this.verses = [];
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
    //this.toc     = new TableOfContent();
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

    // this.toc.addItem(new TocItem(book.id,
    //                              book.abbr,
    //                              book.name,
    //                              book.lname,
    //                              book.desc));
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


  var Parser = function() {
    this.supportedOnly = true;
    this.vre = /(\\\+?(\w+)\*?)\s?/gm;

    // deal with child nodes
    var childTextNode = function (node, str, from, to) {
      var text = str.substring(from, to);
      if (text.length > 0) {
        node.addChild(NH.createText(text, node));
      }
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
        } else {
          if (tag.indexOf(TAG.MT) !== -1 || tag === TAG.TOC1) {
            book.desc = str.trim();
          } else if (tag === TAG.TOC2 || tag === TAG.H) {
            book.name = str.trim();
          } else if (tag === TAG.TOC3) {
            book.abbr = str.trim();
          } else if (tag === TAG.IDE) {
            if (str !== 'UTF-8')
              console.warn('unknown encoding %s in %s book.', str, book.id);
          } else {
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

    this.parseVerseImpl = function(str, ind, arr, re, node) {
      if (node === null)
        return;

      if (arr !== null) {

        // collect the available text
        if (ind < arr.index) {
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
        if (ind < str.length) {
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
          if (np === true)
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
      var lastIndex = 0, cstr = '', cn = '';
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
    var arr = this.vre.exec(tmp);

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
        var book = loadBook(dir + file);
        bible.addBook(book);
      }
      catch (e) {
        log.error('"%s" file processing failed. Error: %s', file, e.message);
      }
    });
    return bible;
  };


  var Renderer = function() {
    this.cache = new Buffer(6 * 1024 * 1024);
    this.offset = 0;
    this.toBuffer = function(str) {
      var written = this.cache.write(str, this.offset);
      this.offset += written;
    };
    this.toString = function() {
      var offset = this.offset;
      this.offset = 0;
      return this.cache.toString('utf8', 0, offset);
    };
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
    if (NH.isText(node)) {
      this.toBuffer(node.text);
      return;
    }

    if (node.tag !== '') {
      this.toBuffer(node.tag + ' ');
    }

    var that = this;
    if (node.nodes.constructor === Array) {
      node.nodes.forEach(function(n) {
        that.renderNode(n);
      });
    }
    else {
      this.renderNode(node.nodes);
    }

    if (node.tag === '')
      return;
    this.toBuffer(node.tag + '*');
  };


  Renderer.prototype.renderVerse   = function(verse, buff) {
    if (!_.isUndefined(verse.np)) {
      this.toBuffer(TAG.P + LF);
    }

    this.toBuffer(TAG.V + ' ' + verse.number + ' ');
    this.renderNode(verse.node);

    if (_.isUndefined(buff)) {
      return this.toString();
    }
  };

  Renderer.prototype.renderChapter = function(chapter, buff) {
    this.toBuffer(TAG.C);
    this.toBuffer(' ');
    this.toBuffer(chapter.number.toString());

    var self = this;
    chapter.verses.forEach(function(v) {
      self.toBuffer(LF);
      self.renderVerse(v, self.cache);
    });

    if (_.isUndefined(buff)) {
      return this.toString();
    }
  };

  Renderer.prototype.renderBook    = function(book, buff) {
    // var res = '';
    // res += TAG.ID   + ' ' + book.id   + ' ' + book.name + LF;
    // res += TAG.H    + ' ' + book.name + LF;
    // res += TAG.TOC1 + ' ' + book.desc + LF;
    // res += TAG.TOC2 + ' ' + book.name + LF;
    // res += TAG.TOC3 + ' ' + book.abbr + LF;
    // res += TAG.MT   + ' ' + book.desc;
    var self = this;
    book.chapters.forEach(function(c) {
      self.toBuffer(LF);
      self.renderChapter(c, self.cache);
    });

    if (_.isUndefined(buff)) {
      return this.toString();
    }
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


