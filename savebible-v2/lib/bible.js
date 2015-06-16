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

  // Constants for line ending
  var LF   = '\n';                    // line feed
  var CR   = '\r';                    // carriage return
  var CRLF = '\r\n';

  // Bible book types
  var BOOK_TYPE_OLD = 1,              // old testament book
      BOOK_TYPE_NEW = 2,              // new testament book
      BOOK_TYPE_ADD = 3,              // additional book
      BOOK_TYPE_SEC = 4;              // secondary book


  /*------------------------------------------------------------------------*/


  // BBMRaw represents a single item into book descriptor file
  //
  // @param {string} id    book unique id
  // @param {number} index book order number, ordering
  // @param {string} abbr  book default abbraviation
  // @param {string} type  book type, i.e. old, new testaments
  //
  var BBMItem = function(id, index, abbr, type) {
    if (!type || type < BOOK_TYPE_OLD || type > BOOK_TYPE_SEC)
      throw 'invalid Bible book mapping item type: ' + type;

    this.id    = id;
    this.index = parseInt(index);
    this.abbr  = abbr;
    this.type  = parseInt(type);
  };


  // Bible books mapping module,
  var BBM = (function() {
    var instance_;        // instance stores a reference to the Singleton


    function init() {
      var items = [];
      var byId  = {};     // sorted by id
      var byOn  = {};     // sorted by order number (i.e. by index)


      idsmap.idsmap.forEach(function(e) {
        var obj = new BBMItem(e.id, e.index, e.abbr, e.type);
        items.push(obj);
      });

      items.sort(function(x, y) {
        return x.index - y.index;
      });

      // initialize maps
      items.forEach(function(e, i) {
        if (!_.isUndefined(byId[e.id]))
          throw 'Duplicate book id in idsmap: ' + e.id;
        byId[e.id]    = i;

        if (!_.isUndefined(byOn[e.index]))
          throw 'Duplicate index found in idsmap' + e.index;
        byOn[e.index] = i;
      });


      var advance = function(id, delta) {
        var ref = instance_.itemById(id);
        if (ref) {
          ref = instance_.itemByOn(ref.index + delta);
          if (ref)
            return ref.id;
        }
        return null;
      };


      return {

        // @returns  bbm item for the book with given `id`
        //           null if the book with given id does not exists
        itemById: function(id) {
          var ref = byId[id];
          if (_.isUndefined(ref))
            return null;
          return items[ref];
        },

        // @returns  bbm item by order number (i.e. by index)
        //           null if there is no such book with given order number
        itemByOn: function(on) {
          var ref = byOn[on];
          if (_.isUndefined(ref))
            return null;
          return items[ref];
        },

        // @returns  items count
        numItems: function() {
          return items.length;
        },

        // @returns  book order number by id
        //           0 if there is no such book with given id
        onById: function(id) {
          var ref = this.itemById(id);
          if (ref === null) {
            return 0;
          }
          return ref.index;
        },

        // @returns  book id by order number
        //           null if there is no such book with given order number
        idByOn: function(on) {
          var ref = this.itemByOn(on);
          if (ref === null)
            return ref;
          return ref.id;
        },

        // @returns  true if an item with given id exists
        existsId: function(id) {
          if (_.isUndefined(byId[id]))
            return false;
          return true;
        },

        // @return  items sorted by order number
        items: function() {
          return items;
        },

        // @returns  ids collection
        ids: function() {
          return byId;
        },

        // @returns  order numbers collection
        ons: function() {
          return byOn;
        },

        // @returns  id that come after the item with specified id,
        //           null if there are no more items
        nextId: function(id) {
          return advance(id, 1);
        },

        // @returns  id that stands before the entry with specified id.
        //           null returned if there are no more items
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


  /*------------------------------------------------------------------------*/


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


  // TAG manipulation
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


  /*------------------------------------------------------------------------*/


  // Node base class, all verses stored as nodes in a tree like structure
  var Node = function(parent) {
  };

  Node.prototype.addChild = function(node) {
    if (_.isUndefined(this.nodes))
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
        if (!_.isUndefined(node.tag))
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
        return node;
      },

      createText: function(text, parent) {
        var node = new Node(parent);
        node.text = text;
        return node;
      },

      normalize: function(node) {
        if (node === null || _.isUndefined(node.nodes) || NH.isText(node))
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


  /*------------------------------------------------------------------------*/


  // Bible verse model
  var Verse = function() {
    this.parent = null;
    this.number = 0;
    this.node   = NH.createCompound('', null);
  };

  Verse.prototype = {
    // @returns  id that will uniquely identify verse in the scope of the
    //           whole bible
    id: function() {
      if (this.parent === null) {
        return 'null 0: ' + this.number;
      }
      return this.parent.id() + ':' + this.number;
    },

    // @returns  Reference {ix: book unchangable index,
    //                      cn: chapter number,
    //                      vn: verse number}
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

    // @retuns   Chapter number that holds this verse,
    //           0 for isolated chapters
    cn: function() {
      if (this.parent)
        return this.parent.number;
      return 0;
    },

    // @returns  id of the book, that holds this verse,
    //           empty string will be returned if no parent exists
    bid: function() {
      if (this.parent)
        return this.parent.bid();
      return '';
    },

    // @returns  The next verse of the chapter containing current verse
    //           null if there is not any more verse after this one
    next: function() {
      if (this.parent)
        return this.parent.getVerse(this.number + 1);
      return null;
    },

    // @returns  Previous verse of the chapter containing current verse
    prev: function() {
      if (this.parent)
        return this.parent.getVerse(this.number - 1);
      return null;
    },

    // @returns  Representation of the verse rendered with the give renderer
    render: function(renderer) {
      return renderer.renderVerse(this);
    }
  };


  // @param  {string} decodedRef  Object retrived by Verse.ref(),
  //                              Expected input have a specified form
  //                              { ix: number,
  //                                cn: chapter number,
  //                                vn: verse number }
  // @returns  8 bytes lenght string of for 'XXCCCVVV'
  function encodeRef(decodedRef) {
    return padNumber(decodedRef.ix, 2) +
      padNumber(decodedRef.cn, 3) +
      padNumber(decodedRef.vn, 3);
  }

  // See encodeRef, this function performs opposite job of encodeRef
  function decodeRef(encodedRef) {
    return {
      ix: parseInt(encodedRef.substr(0, 2)),
      cn: parseInt(encodedRef.substr(2, 3)),
      vn: parseInt(encodedRef.substr(5, 3))
    };
  }


  /*------------------------------------------------------------------------*/


  // Bible chapter model
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

    // @returns  reference for the chapter
    //           { ix: book unchangable index,
    //             cn: chapter number,
    //             vn: verse number }
    ref: function() {
      if (this.parent === null) {
        return {ix: 0, cn: this.number, vn: 0};
      }
      var t = this.parent.ref();
      t.cn = this.number;
      return t;
    },

    // @returns  Book id containing current verse
    bid: function() {
      if (this.parent) {
        return this.parent.id;
      }
      return '';
    },

    // @return   Next chapter in the book containing current chapter
    //           null there are no more
    next: function() {
      if (this.parent)
        return this.parent.getChapter(this.number + 1);
      return null;
    },

    // @returns  Previous chapter in the book containing current chapter
    //           null there are no more
    prev: function() {
      if (this.parent)
        return this.parent.getChapter(this.number - 1);
      return null;
    },

    // @returns  Number of verses in the chapter
    numVerses: function() {
      return this.verses.length;
    },

    // Insert verse into the chapter, throw exception if something went wrong
    //
    // @param {object} verse  Bible verse object
    // @returns               Reference to chapter object where the verse has
    //                        been added
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

    // @param  {number} number  Verse number
    // @return {object}         Verse object, null if no
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

    // @returns  Representation of the chapter rendered with the give renderer
    render: function(renderer) {
      return renderer.renderChapter(this);
    }
  };


  /*------------------------------------------------------------------------*/


  var Book = function() {
    this.parent   = null;
    this.index    = 0;
    this.id       = '';
    this.abbr     = '';
    this.name     = '';
    this.lname    = '';
    this.desc     = '';
    this.chapters = [];
    this.preface  = [];
  };


  Book.prototype = {

    // @returns  Reference for the chapter
    //           { ix: book unchangable index,
    //             cn: chapter number,
    //             vn: verse number }
    ref: function() {
      return {ix: this.index, cn: 0, vn: 0};
    },

    // @return   Next book of the Bible, null if there are no more books
    next: function() {
      if (this.parent) {
        var tocItem = this.parent.getToc().nextItem(this.id);
        if (tocItem)
          return this.parent.getBook(tocItem.id);
      }
      return null;
    },

    // @return   Previous book of the Bible, null if there are no more books
    prev: function() {
      if (this.parent) {
        var tocItem = this.parent.getToc().prevItem(this.id);
        if (tocItem)
          return this.parent.getBook(tocItem.id);
      }
      return null;
    },

    // @returns  Number of chapter in the book
    numChapters: function() {
      return this.chapters.length;
    },

    // @todo:comment
    addChapter: function(chapter) {
      chapter.parent = this;
      if ( chapter.number - this.numChapters() !== 1 ) {
        throw 'detected chapter gap while adding ' + chapter.id();
      }
      this.chapters.push(chapter);
      return this;
    },

    // @todo:comment
    getChapter: function(number) {
      if (number < 1 || number > this.numChapters())
        return null;
      return this.chapters[number - 1];
    },

    // @todo:comment
    render: function(renderer) {
      return renderer.renderBook(this);
    }

    // getVerse: function(cn, vn) {
    //   if (cn > this.chapters.length || cn < 1)
    //     throw 'invalid chapter for book \"' + this.id + '\": [' + cn + '/' + this.chapters.length + ']';
    //   return this.chapters[cn - 1].getVerse(vn);
    // }
  };


  /*------------------------------------------------------------------------*/


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


  Bible.prototype.reorder = function(fn) {
    if (_.isUndefined(fn)) {
      fn = function(x, y) {
        return BBM.instance().itemById(x.id).index -
               BBM.instance().itemById(y.id).index;
      };
    }
    this.books.sort(fn);

    var self = this;
    this.books.forEach(function(b, i) {
      self.ids[b.id] = i;
    });
  };

  // @returns  Number of book in the Bible
  Bible.prototype.numBooks = function() {
    return this.books.length;
  };

  // @todo:comment
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

  // @todo:comment
  Bible.prototype.getBook = function(id) {
    var ref = this.ids[id];
    if (_.isUndefined(ref))
      return null;
    return this.books[ref];
  };

  // @todo:comment
  Bible.prototype.getToc = function() {
    return this.toc;
  };


  /*------------------------------------------------------------------------*/


  // @todo:comment
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

      var tmp = BBM.instance().itemById(book.id);
      book.index = tmp.index;
      if (!BBM.instance().existsId(book.id))
        throw 'Invalid book id: ' + book.id;
      if (book.abbr === '')
        book.abbr = tmp.abbr;
    };

    this.parseVerseImpl = function(str, ind, arr, re, xnode) {
      var stack = [], node;
      stack.push(xnode);

      while (true) {
        node = stack[stack.length - 1];
        if (arr !== null) {
          // collect the available text
          if (ind < arr.index && node !== null) {
            childTextNode(node, str, ind, arr.index);
          }

          var tag = arr[1];
          if (TH.isOpening(tag)) {
            var compoundNode = NH.createCompound(tag, node);

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


  /*------------------------------------------------------------------------*/


  // Load bible book from the specified file and construct Book object
  //
  // @param  {string} file  Name of file containing Bible book in a usfm format
  // @return {object}       Book object
  //
  var loadBook = function(file) {
    var parser = new Parser();
    var str    = fs.readFileSync(file, 'utf8');
    var book   = parser.parseBook(str);
    return book;
  };


  // Load bible books from the specified directory and construct bible object
  //
  // @param  {string} dir directory containing usfm files
  // @return {object}     bible object
  //
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


  /*------------------------------------------------------------------------*/


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
    if (!_.isUndefined(node.text))
      return node.text;

    var res = '', self = this;
    if (!_.isUndefined(node.nodes)) {
      // compound node with single node
      if (node.nodes.constructor !== Array)
        res = this.renderNode(node.nodes);
      else {
        node.nodes.forEach(function(n) {
          res += self.renderNode(n);
        });
      }
    }

    if (node.tag === '')
      return res;
    return node.tag + ' ' + res + node.tag + '*';
  };

  Renderer.prototype.renderVerse   = function(verse) {
    var prefix = '';
    if (!_.isUndefined(verse.np))
      prefix = TAG.P + LF;
    return prefix + TAG.V + ' ' + verse.number + ' ' + this.renderNode(verse.node);
  };

  Renderer.prototype.renderChapter = function(chapter) {
    var res = TAG.C + ' ' + chapter.number;
    var self = this;
    chapter.verses.forEach(function(v) {
      res += LF + v.render(self);
    });
    return res;
  };

  Renderer.prototype.renderBook    = function(book) {
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

  Renderer.prototype.renderBible   = function(bible) {
    var res = '';
    var self = this;

    bible.books.forEach(function(b) {
      if (res !== '')
        res += LF;
      res += b.render(self);
    });
    return res;
  };


  /*------------------------------------------------------------------------*/


  var USFMRenderer = function() {
    Renderer.call(this);
  };
  inherit(USFMRenderer, Renderer);


  /*------------------------------------------------------------------------*/


  var TextRenderer = function() {
    Renderer.call(this);
  };
  inherit(TextRenderer, Renderer);




  exports.BBM          = BBM;

  exports.Verse        = Verse;
  exports.Book         = Book;
  exports.Chapter      = Chapter;
  exports.Bible        = Bible;
  exports.Parser       = Parser;

  exports.Renderer     = Renderer;
  exports.USFMRenderer = USFMRenderer;
  exports.TextRenderer = TextRenderer;

  exports.loadBook     = loadBook;
  exports.loadBible    = loadBible;



}.call(this));

require('../config').logFileLoading(__filename);


