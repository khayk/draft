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
      BOOK_TYPE_DEU = 3,              // deuterocanon book
      BOOK_TYPE_APO = 4;              // apocryphal book


  /*------------------------------------------------------------------------*/


  // BBMRaw represents a single item into book descriptor file
  //
  // @param {string} id    book unique id
  // @param {number} index book order number, ordering
  // @param {string} type  book type, i.e. old, new testaments
  //
  var BBMItem = function(id, index, type) {
    if (!type || type < BOOK_TYPE_OLD || type > BOOK_TYPE_APO)
      throw 'Invalid Bible book mapping item type: ' + type;

    this.id    = id;
    this.index = parseInt(index);
    this.type  = parseInt(type);
  };


  // Bible books mapping module,
  var BBM = (function() {
    var mappings_ = {};    // possibility to work with different mappings
    var instance_;         // active instance of existing mappings


    function init(imap) {
      var items = [];
      var byId  = {};     // sorted by id
      var byOn  = {};     // sorted by order number (i.e. by index)


      imap.forEach(function(e) {
        var obj = new BBMItem(e.id, e.index, e.type);
        items.push(obj);
      });

      items.sort(function(x, y) {
        return x.index - y.index;
      });

      // initialize maps
      items.forEach(function(e, i) {
        if (!_.isUndefined(byId[e.id]))
          throw 'Duplicate book id in the ids mapping: ' + e.id;
        byId[e.id]    = i;

        if (!_.isUndefined(byOn[e.index]))
          throw 'Duplicate index found in ids mapping: ' + e.index;
        byOn[e.index] = i;
      });

      var getItem = function(i) {
        if (i < 0 || i >= items.length)
          return null;
        return items[i];
      };

      var getItemId = function(i) {
        var ref = getItem(i);
        if (ref === null)
          return null;
        return ref.id;
      };

      var advance = function(id, diff) {
        var i = byId[id];
        if (_.isUndefined(i))
          return null;
        return getItemId(i + diff);
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

        // @return  id of the book that stands at the first position
        //          in the ordered books collection
        firstId: function() {
          if (items.length > 0)
            return items[0].id;
          return null;
        },

        // @return  id of the book that stands at the last position
        //          in the ordered books collection
        lastId: function() {
          if (items.length > 0)
            return items[items.length - 1].id;
          return null;
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
      // Creates and activates the BBM instance according to specified mapping
      //
      // @param {array} imap  array of ids mapping, if `undefined` default
      //                      mapping will be activated
      //
      // @returns   activated instance of BBM
      activate: function(imap) {

        // activate default mapping if not input is provided
        if (_.isUndefined(imap)) {
          if (!_.isUndefined(idsmap.idsmap))
            return this.activate(idsmap.idsmap);
        }

        if (_.isUndefined(mappings_[imap])) {
          var tmp = init(imap);
          mappings_[imap] = tmp;
        }
        instance_ = mappings_[imap];
        return instance_;
      },

      // @returns  last activated instance of the BBM, if no active instance
      //           exists, the default one will be created, activated and
      //           returned
      instance: function() {
        if (!instance_) {
          return this.activate();
        }
        return instance_;
      }
    };
  })();


  /*------------------------------------------------------------------------*/


  var Lexical = function() {
  };


  // Table of content single entry
  // @param {string} id    book id
  // @param {string} abbr  book abbreviation
  // @param {string} name  book name
  // @param {string} lname book long name
  // @param {string} desc  book description
  //
  var TocEntry = function(id, abbr, name, lname, desc) {
    this.id    = id || '';
    this.abbr  = abbr || '';
    this.name  = name || '';
    this.lname = lname || '';
    this.desc  = desc || '';
  };

  // Populate TocEntry as it is requested
  //
  // @param  {object} te        table of content single entry
  // @param  {bool}   overwrite to overwrite existing values set to true,
  //                            otherwise only missing fields will be
  //                            populated
  TocEntry.prototype.populate = function(te, overwrite) {
    if (!_.isUndefined(overwrite) && overwrite === true) {
      if (this.id !== te.id)
        throw 'Unable to populate attributes from the source with different id';
      this.abbr  = te.abbr;
      this.name  = te.name;
      this.lname = te.lname;
      this.desc  = te.desc;
    }
    else {
      // write only missing entries
      if (this.id !== te.id)
        throw 'Unable to populate attributes from the source with different id';

      if (this.name === '')
        this.name = te.name;
      if (this.lname === '')
        this.lname = te.lname;
      if (this.desc === '')
        this.desc = te.desc;
    }
  };

  // Compare current object with specified one
  //
  // @param  {object} te table of content single entry
  // @return {bool}   true if all field are the same, otherwise false
  // //
  // TocEntry.prototype.equal = function(te) {
  //   return  this.id === te.id &&
  //           this.abbr === te.abbr &&
  //           this.name === te.name &&
  //           this.lname === te.lname &&
  //           this.desc === te.desc;
  // };

  // Make sure the the current object is a valid table of content
  // entry: i.e. all mandatory fields are presented and not empty
  TocEntry.prototype.validate = function() {
    if (this.id === '')
      throw 'missing id';
    if (this.abbr === '')
      throw 'missing abbr with id: ' + this.id;
    if (this.name === '')
      throw 'missing name with id: ' + this.id;
    if (this.lname === '')
      throw 'missing lname with id: ' + this.id;
  };

  TocEntry.prototype.normalize = function() {
    this.id    = this.id.trim();
    this.abbr  = this.abbr.trim();
    this.name  = this.name.trim();
    this.lname = this.lname.trim();
    this.desc  = this.desc.trim();

    // borrow name for long name if it is empty
    if (this.lname === '')
      this.lname = this.name;
  };

  /*------------------------------------------------------------------------*/


  // Table of content object for the Bible object
  var TableOfContents = function() {
    var content_ = {};
    var size_ = 0;

    return {
      // @return number of entries
      length: function() {
        return size_;
      },

      // Add new entry
      // @param {object} te TocEntry object
      //
      // throws an exception if detected addition of duplicate entry
      add: function(te) {
        if (!_.isUndefined(content_[te.id]))
          throw 'id ' + te.id + ' already exists';
        content_[te.id] = te;
        ++size_;
      },

      // @param  {string} id  book id
      // @return {object}     reference to TocEntry object
      get: function(id) {
        var te = content_[id];
        if (_.isUndefined(te))
          return null;
        return te;
      },

      // @returns  first entry from the table of content
      first: function() {
        var cid = BBM.instance().firstId();
        while (cid) {
          var te = this.get(cid);
          if (te)
            return te;
          cid = BBM.instance().nextId(cid);
        }
        return null;
      },

      // @param {string} id  entry id
      // @returns  entry that stands after the entry with specified id
      next: function(id) {
        var cid = id;
        while (cid) {
          cid = BBM.instance().nextId(cid);
          var te = this.get(cid);
          if (te)
            return te;
        }
        return null;
      },

      // @param {string} id  entry id
      // @returns  entry that stands before the entry with specified id
      prev: function(id) {
        var cid = id;
        while (cid) {
          cid = BBM.instance().prevId(cid);
          var te = this.get(cid);
          if (te)
            return te;
        }
        return null;
      },

      // @returns  true if the table of content contains an entry with given id,
      //           otherwise false
      have: function(id) {
        return !_.isUndefined(content_[id]);
      },

      // populate current table of content existing entries with
      //
      // @param {object}  toc  object to copy from
      populate: function(toc, overwrite) {
        _.each(content_, function(val, key) {
          var ti = toc.get(key);
          if (ti !== null)
            val.populate(ti, overwrite);
        });
      },

      // verify that core attributes are presented in the table of content
      validate: function() {
        _.each(content_, function(val, key) {
          val.validate();
        });
      }
    };
  };


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
      // @param {string} tag  usfm tag, like this \tag, \+tag, \tag*
      // @returns             true if the specified tag is supported by the
      //                      application, otherwise false
      isSupported: function(tag) {
        return supported.test(tag) !== false;
      },

      // @param {string} tag  see above
      // @returns             true if the tag is not closing, i.e. ends with *
      isOpening: function(tag) {
        return tag[tag.length - 1] !== '*';
      },

      // @returns   true for translator tags
      isTranslator: function(tag) {
        return translator.test(tag) !== false;
      },

      // @returns   true for tags identifying Jesus Words
      isJesusWord: function(tag) {
        return jesusWord.test(tag) !== false;
      },

      // name of tag
      // @param  {string} tag tag string
      // @param  {string} def value to be returned, if tag is not supported
      // @return {string}     tag's name without special symbols (\wj -> wj,
      //                      \+add -> add)
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
  var Node = function() {
  };

  Node.prototype.addChild = function(node) {
    if (this.firstChild() === null) {
      this.first = node;
      this.last  = node;
    }
    else {
      this.last.next = node;
      this.last = node;
    }
  };

  Node.prototype.firstChild = function() {
    if (_.isUndefined(this.first))
      return null;
    return this.first;
  };

  Node.prototype.getNext = function() {
    if (_.isUndefined(this.next))
      return null;
    return this.next;
  };

  Node.prototype.haveNext = function() {
    return !_.isUndefined(this.next);
  };

  Node.prototype.haveChild = function() {
    return !_.isUndefined(this.first);
  };

  Node.prototype.count = function() {
    var count = 1;
    if (this.haveChild())
      count += this.first.count();
    if (this.haveNext())
      count += this.next.count();
    return count;
  };

  Node.prototype.normalize = function() {
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
      }
      else {
        prev = n;
      }
      n = n.getNext();
    }
  };

  var NH = (function() {
    return {
      isTag: function(node) {
        if (!_.isUndefined(node.tag))
          return true;
        return false;
      },

      isText: function(node) {
        if (!_.isUndefined(node.text))
          return true;
        return false;
      },

      createTag: function(tag) {
        var node = new Node();
        node.tag = tag;
        return node;
      },

      createText: function(text) {
        var node = new Node();
        node.text = text;
        return node;
      }
    };
  })();


  /*------------------------------------------------------------------------*/


  // Bible verse model
  var Verse = function() {
    this.parent = null;
    this.number = 0;
    this.node   = NH.createTag('', null);
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
    return _.padLeft(decodedRef.ix, 2, '0') +
           _.padLeft(decodedRef.cn, 3, '0') +
           _.padLeft(decodedRef.vn, 3, '0');
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
      return this.parent.te.id + ' ' + this.number;
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
        return this.parent.te.id;
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
        log.warn('detected verse gap while adding verse ' + verse.id());
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

    // @todo:comment
    // addHeading: function(text) {
    //   var loc = this.verses.length;
    //   if (_.isUndefined(this.heading[loc]))
    //     this.heading[loc] = [];
    //   this.heading[loc].push(text);
    // },

    // @returns  Representation of the chapter rendered with the give renderer
    render: function(renderer) {
      return renderer.renderChapter(this);
    }
  };


  /*------------------------------------------------------------------------*/


  var Book = function() {
    this.parent   = null;
    this.index    = 0;
    this.te       = new TocEntry();
    this.chapters = [];
    this.preface  = [];
    this.header   = [];
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
        var te = this.parent.getToc().next(this.te.id);
        if (te)
          return this.parent.getBook(te.id);
      }
      return null;
    },

    // @return   Previous book of the Bible, null if there are no more books
    prev: function() {
      if (this.parent) {
        var te = this.parent.getToc().prev(this.te.id);
        if (te)
          return this.parent.getBook(te.id);
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

    // @returns  Representation of the book rendered with the give renderer
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
    this.toc     = new TableOfContents();
  };

  // @returns  Representation of the bible rendered with the give renderer
  Bible.prototype.render = function(renderer) {
    return renderer.renderBible(this);
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
    if (!_.isUndefined(this.ids[book.te.id]))
      throw 'book ' + book.te.id + ' is already exist in the bible';

    book.parent = this;
    this.books.push(book);
    this.ids[book.te.id] = this.books.length - 1;
    this.toc.add(book.te);
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
  var Parser = function(supportedOnly) {
    this.supportedOnly = supportedOnly;
    this.vre = /(\\\+?(\w+)\*?)\s?/gm;

    // deal with child nodes
    var childTextNode = function (node, str, from, to) {
      var text = str.substring(from, to);
      if (text.length > 0) {
        node.addChild(NH.createText(text));
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
            throw 'Failed to identify book id';
          book.te.id = arr[1];
        } else {
          if (tag === TAG.TOC1) {
            book.te.desc = str.trim();
          } else if (tag === TAG.TOC2) {
            book.te.name = str.trim();
          } else if (tag === TAG.TOC3) {
            book.te.abbr = str.trim();
          } else if (tag === TAG.IDE) {
            if (str !== 'UTF-8')
              throw util.format('Unknown encoding %s in %s book.', str, book.te.id);
          } else {
            book.header.push({tag: tag, value: str});
          }
        }
      }

      // @todo: fill abbreviation based on default values
      var tmp = BBM.instance().itemById(book.te.id);
      if (!BBM.instance().existsId(book.te.id))
        throw 'Invalid book id: ' + book.te.id;
    };

    this.parseVerseImpl = function(str, vnode) {
      var ind = 0;
      var arr = this.vre.exec(str);
      var re  = this.vre;
      var stack = [];
      var node;

      stack.push(vnode);

      while (true) {
        node = stack[stack.length - 1];
        if (arr !== null) {
          // collect the available text
          if (ind < arr.index && node !== null) {
            childTextNode(node, str, ind, arr.index);
          }

          var tag = arr[1];
          if (TH.isOpening(tag)) {
            var compoundNode = NH.createTag(tag);

            // collect supported tags
            if (this.supportedOnly === false) {
              node.addChild(compoundNode);
            } else if (TH.isSupported(tag)) {
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
    var verse = new Verse();
    this.parseVerseImpl(tmp, verse.node);
    verse.node.normalize();
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

  // Parse file name and return object with meta information contained in
  // the name of file, in the description below the followin abbreviations
  // are used
  //
  // N     two digist number containing book index (order number)
  // ID    string with 3 characters containing the book id
  // LN    string with 2 or 3 characters indicating book language,
  // NAME  string containing containing bible book name abbreviation
  //
  // @param  {string}  file   Name of the file to parse
  // @param  {boolean} strict Parsing mode, in the strict mode
  //                          only allowed format is
  //                          {N}-{ID}{LN}-{NAME}.usfm
  //                          otherwise format will be allowed
  //                          {N}-{ID}.usfm
  // @return {object}         {on: N, id: ID, lang: LN, bibleAbbr: NAME} for
  //                          strict mode, or {on: N, id: ID} non-strict
  //                          mode, or null if the format is not recognized
  function decodeFileName(file, strict) {
    if (_.isUndefined(strict) || (typeof strict !== 'boolean')) {
      strict = true;
    }

    file = path.basename(file);
    var arr = /(\d+)-(\w{3})(\w{2,3})-(\w+)/g.exec(file);
    if (arr !== null) {
      return {
        on: parseInt(arr[1]),
        id: arr[2].toUpperCase(),
        lang: arr[3].toLowerCase(),
        bibleAbbr: arr[4].toUpperCase()
      };
    }

    if (!strict) {
      arr = /(\d+)-(\w{3})/g.exec(file);
      if (arr !== null) {
        return {
          on: parseInt(arr[1]),
          id: arr[2].toUpperCase()
        };
      }
    }

    return null;
  }

  // Load bible book from the specified file and construct Book object
  //
  // @param  {string} file   Name of file containing Bible book in a usfm format
  // @param  {object} opts   Control book loader behaviour with various options
  // @param  {object} parser Parser object to reuse
  // @return {object}        Book object
  //
  function loadBook(file, opts, parser) {
    if (_.isUndefined(opts)) {
      opts = {
        supportedOnly: true,
        strictFilename: true
      };
    }

    if (_.isUndefined(parser))
      parser = new Parser(opts.supportedOnly);

    var info = decodeFileName(file, opts.strictFilename);
    if (info === null)
      throw 'File name requiremens are not met: ' + file;
    var str    = fs.readFileSync(file, 'utf8');
    var book   = parser.parseBook(str);

    // make sure that filename and content are synchronized
    if (book.te.id !== info.id) {
      log.warn('Book id from "%s" file does not match with id from file name');
    }

    return book;
  }

  // Load bible books from the specified directory and construct bible object
  //
  // @param  {string} dir   Directory path containing usfm files
  // @param  {object} opts  Control bible loader behaviour with various options
  // @return {object}       Bible object
  //
  function loadBible(dir, opts) {
    if (_.isUndefined(opts)) {
      opts = {
        supportedOnly: true,
        strictFilename: true
      };
    }

    dir        = path.normalize(dir + '/');
    var files  = fs.readdirSync(dir, 'utf8');
    var bible  = new Bible();
    var parser = new Parser(opts.supportedOnly);

    files.forEach(function(file) {
      // skip files that are not usfm
      if (path.extname(file).toLowerCase() !== '.usfm')
        return;
      try {
        var book = loadBook(dir + file, opts, parser);

        // add meta information into bible if it is available through file name
        var info = decodeFileName(file, opts.strictFilename);
        if (info !== null) {
          if (!_.isUndefined(info.lang))
            bible.lang = info.lang;
          if (!_.isUndefined(info.bibleAbbr))
            bible.abbr = info.bibleAbbr;
        }

        bible.addBook(book);
      }
      catch (e) {
        log.error('"%s" file processing failed. Error: %s', file, e);
      }
    });

    return bible;
  }

  // Save bible books to the specified directory by according to save rules
  //
  // @param  {object} bible  Bible object to be stored
  // @param  {object} opts   Save options
  // @param  {string} dir    Directory to save usfm files
  var saveBible = function(bible, dir, opts) {

  };

  /*------------------------------------------------------------------------*/


  var Renderer = function() {
  };

  // These functions `SHOULD BE` overridden in the derived classes
  Renderer.prototype.renderOpenTag        = function(tag)   { throw 'implement renderOpenTag!'; };
  Renderer.prototype.renderCloseTag       = function(tag)   { throw 'implement renderCloseTag!'; };
  Renderer.prototype.renderOpenParagraph  = function(verse) { throw 'implement renderOpenParagraph!'; };
  Renderer.prototype.renderCloseParagraph = function(verse) { throw 'implement renderCloseParagraph!'; };
  Renderer.prototype.renderVerseEnd       = function(verse) { throw 'implement renderVerseEnd!'; };
  Renderer.prototype.renderVerseNumber    = function(verse) { throw 'implement renderVerseNumber!'; };
  Renderer.prototype.renderChapterEnd     = function(verse) { throw 'implement renderChapterEnd!'; };
  Renderer.prototype.renderChapterNumber  = function(chap)  { throw 'implement renderChapterNumber!'; };
  Renderer.prototype.renderBookHeader     = function(book)  { throw 'implement renderBookHeader!'; };
  Renderer.prototype.renderBookEnd        = function(book)  { throw 'implement renderBookEnd!'; };


  // These functions `SHOULD NOT` be overridden in the derived classes
  Renderer.prototype.renderNode    = function(node)  {
    var res = '', tail = '';
    if (NH.isText(node))
      res += node.text;
    else {
      if (node.tag !== '') {
        res += this.renderOpenTag(node.tag);
        tail = this.renderCloseTag(node.tag);
      }
    }

    if (node.haveChild())
      res += this.renderNode(node.first);

    res += tail;

    if (node.haveNext())
      res += this.renderNode(node.next);
    return res;
  };

  Renderer.prototype.renderVerse   = function(verse) {
    return this.renderVerseNumber(verse) + this.renderNode(verse.node);
  };

  Renderer.prototype.renderChapter = function(chapter) {
    var res = this.renderChapterNumber(chapter);
    var self = this;

    var popen  = '';
    var pclose = '';

    chapter.verses.forEach(function(v) {
      if (!_.isUndefined(v.np)) {
        popen  = self.renderOpenParagraph(v);
        pclose = self.renderCloseParagraph(v);
      }
      else {
        popen  = '';
        pclose = '';
      }

      res += (popen + v.render(self) + pclose + self.renderVerseEnd(v));
    });
    return res;
  };

  Renderer.prototype.renderBook    = function(book) {
    var res = this.renderBookHeader(book);
    var self = this;
    book.chapters.forEach(function(c) {
      res += c.render(self);
      res += self.renderChapterEnd(c);
    });
    return res;
  };

  Renderer.prototype.renderBible   = function(bible) {
    var res = '';
    var self = this;

    bible.books.forEach(function(b) {
      res += b.render(self);
      res += self.renderBookEnd(b);
    });
    return res;
  };


  /*------------------------------------------------------------------------*/


  var USFMRenderer = function() {
    Renderer.call(this);
  };
  inherit(USFMRenderer, Renderer);

  USFMRenderer.prototype.renderOpenTag = function(tag) {
    return tag + ' ';
  };

  USFMRenderer.prototype.renderCloseTag = function(tag) {
    return tag + '*';
  };

  USFMRenderer.prototype.renderOpenParagraph = function(verse) {
    return TAG.P + LF;
  };

  USFMRenderer.prototype.renderCloseParagraph = function(verse) {
    return '';
  };

  USFMRenderer.prototype.renderVerseEnd = function(verse) {
    return LF;
  };

  USFMRenderer.prototype.renderVerseNumber = function(verse) {
    return TAG.V + ' ' + verse.number + ' ';
  };

  USFMRenderer.prototype.renderChapterEnd = function(verse) {
    return '';
  };

  USFMRenderer.prototype.renderChapterNumber = function(chap)  {
    return TAG.C + ' ' + chap.number + LF;
  };

  USFMRenderer.prototype.renderBookHeader = function(book)  {
    var res = '';
    res += TAG.ID   + ' ' + book.te.id   + ' ' + book.te.name + LF;
    res += TAG.H    + ' ' + book.te.name + LF;
    res += TAG.TOC1 + ' ' + book.te.desc + LF;
    res += TAG.TOC2 + ' ' + book.te.name + LF;
    res += TAG.TOC3 + ' ' + book.te.abbr + LF;
    res += TAG.MT   + ' ' + book.te.desc + LF;
    return res;
  };

  USFMRenderer.prototype.renderBookEnd = function(book) {
    return '';
  };


  /*------------------------------------------------------------------------*/


  var TextRenderer = function(opts) {
    if (!opts)
      opts = { textOnly: true };
    else if (typeof opts !== 'object')
      throw new TypeError('Bad arguments');
    this.textOnly = opts.textOnly;
    Renderer.call(this);
  };
  inherit(TextRenderer, Renderer);

  TextRenderer.prototype.renderOpenTag = function(tag) {
    if (TH.isTranslator(tag))
      return '[';
    return '';
  };

  TextRenderer.prototype.renderCloseTag = function(tag) {
    if (TH.isTranslator(tag))
      return ']';
    return '';
  };

  TextRenderer.prototype.renderOpenParagraph = function(verse) {
    return '';
  };

  TextRenderer.prototype.renderCloseParagraph = function(verse) {
    return '';
  };

  TextRenderer.prototype.renderVerseEnd = function(verse) {
    return LF;
  };

  TextRenderer.prototype.renderVerseNumber = function(verse) {
    if (this.textOnly)
      return '';
    return verse.id() + ' ';
  };

  TextRenderer.prototype.renderChapterEnd = function(verse) {
    return '';
  };

  TextRenderer.prototype.renderChapterNumber = function(chap)  {
    return '';
  };

  TextRenderer.prototype.renderBookHeader = function(book)  {
    return '';
  };

  TextRenderer.prototype.renderBookEnd = function(book) {
    return '';
  };


  /*------------------------------------------------------------------------*/



  exports.BBM             = BBM;
  exports.TocEntry        = TocEntry;
  exports.TableOfContents = TableOfContents;
  exports.TH              = TH;

  exports.Verse           = Verse;
  exports.Book            = Book;
  exports.Chapter         = Chapter;
  exports.Bible           = Bible;
  exports.Parser          = Parser;

  exports.Renderer        = Renderer;
  exports.USFMRenderer    = USFMRenderer;
  exports.TextRenderer    = TextRenderer;

  // functions
  exports.encodeRef       = encodeRef;
  exports.decodeRef       = decodeRef;
  exports.loadBook        = loadBook;
  exports.loadBible       = loadBible;
  exports.decodeFileName  = decodeFileName;

  exports.inherit         = inherit;

}.call(this));

require('../config').logFileLoading(__filename);


