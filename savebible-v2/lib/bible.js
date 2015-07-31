var fs     = require('fs');
var path   = require('path');
var _      = require('lodash');
var util   = require('util');
var mkdirp = require('mkdirp');

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


  // Lexical information for a single language
  // @param {object} data  js object containing lexical specific data
  var Lexical = function(data) {
    this.data_ = {
      reLetters    : new RegExp('['  + data.letters + ']', 'gm'),
      reNonLetters : new RegExp('[^' + data.letters + '\\s]', 'gm'),
      question     : data.question,
      emphasis     : data.emphasis,
      letters      : data.letters
    };
  };

  // @returns language letters with regex definition rules
  Lexical.prototype.getLetters = function() {
    return this.data_.letters;
  };

  // @returns string without punctuations
  Lexical.prototype.removePunctuations = function(str) {
    return str.replace(this.data_.reNonLetters, '');
  };

  // @return string without langage letters
  Lexical.prototype.removeLetters = function(str) {
    return str.replace(this.data_.reLetters, '');
  };


  /*------------------------------------------------------------------------*/


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
  var TableOfContents = function(tocArray) {
    this.content_ = {};
    this.size_ = 0;

    if (!_.isUndefined(tocArray)) {
      var that = this;
      tocArray.forEach(function(e) {
        var te = new TocEntry(e.id, e.abbr, e.name, e.lname, e.desc);
        that.add(te);
      });
    }
  };

  TableOfContents.prototype = {
    // @return number of entries
    length: function() {
      return this.size_;
    },

    // Add new entry
    // @param {object} te TocEntry object
    //
    // throws an exception if detected addition of duplicate entry
    add: function(te) {
      if (!_.isUndefined(this.content_[te.id]))
        throw 'id ' + te.id + ' already exists';
      this.content_[te.id] = te;
      ++this.size_;
    },

    // @param  {string} id  book id
    // @return {object}     reference to TocEntry object
    get: function(id) {
      var te = this.content_[id];
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
      return !_.isUndefined(this.content_[id]);
    },

    // populate current table of content existing entries with
    //
    // @param {object}  toc  object to copy from
    populate: function(toc, overwrite) {
      _.each(this.content_, function(val, key) {
        var ti = toc.get(key);
        if (ti !== null)
          val.populate(ti, overwrite);
      });
    },

    // verify that core attributes are presented in the table of content
    validate: function() {
      _.each(this.content_, function(val, key) {
        val.validate();
      });
    }
  };


  /*------------------------------------------------------------------------*/


  // Kind of storage where we collect bible specific data for a given language
  // like, table of content, language specific lexical data and so on.
  var Meta = function() {
    this.lex  = null;
    this.toc  = null;
    this.lang = '';
  };

  // load meta data from the given json file
  // @returns  this object
  Meta.prototype.load = function(file) {

    // load file content
    var data = fs.readFileSync(file, 'utf8');
    var js = JSON.parse(data);

    // identify language
    var ext   = path.extname(file);
    this.lang = path.basename(file, ext);
    this.lex  = new Lexical(js.lexical);
    this.toc  = new TableOfContents(js.toc);

    return this;
  };


  /*------------------------------------------------------------------------*/


  // Collection of Meta objects, each entry represent a single language
  var MC = (function() {
    var instance_;      // instance stores a reference to the Singleton
    var metas_ = {};    // key is a language for a meta

    function init() {
      return {

        // Loads all available meta object in the given directory
        //
        // @param  {string} dir  directory where meta dates are located
        // @return {object}      returns itself, that are initialized
        load: function(dir) {
          // clean previous call
          this.clean();
          var that = this;

          dir = path.normalize(dir + '/');
          var files  = fs.readdirSync(dir, 'utf8');

          files.forEach(function(file) {
            if (path.extname(file).toLowerCase() === '.json') {
              try {
                var meta = new Meta();
                meta.load(dir + file);
                that.addMeta(meta);
              } catch (e) {
                log.error('"%s" file processing failed. Error: %s', file, e);
                throw e;
              }
            }
          });
        },

        // @brief  clean all data stored in the container
        clean: function() {
          metas_ = {};
        },

        // @brief  add meta object to the collection
        addMeta: function(meta) {
          var lang = meta.lang;
          if (_.isUndefined(metas_[lang])) {
            metas_[lang] = meta;
          }
          else {
            throw 'Language \"' + lang + '\" is already exists';
          }
        },

        // @param {string}  lang  meta language
        // @return          meta object that predestined for given language
        getMeta: function(lang) {
          var ref = metas_[lang];
          if (_.isUndefined(ref))
            return null;
          return ref;
        },

        // @param {string}  lang  meta language
        // @returns  true if MC collection store meta object with given language
        haveMeta: function(lang) {
          return !_.isUndefined(metas_[lang]);
        },

        // @returns  array of all languages contained in the collection
        getLanguages: function() {
          return Object.keys(this.getAll());
        },

        // @returns  object that holds all meta specific information
        getAll: function() {
          return metas_;
        },

        // It is common that several versions of the bible use the same
        // meta information, or we want to share some meta object between
        // other languages
        //
        // @param  {string} ln  language name that is going to be linked
        // @param  {string} to  language name that is already contained in
        //                      the MC, its meta will be used for new language
        // @return {object}     new Meta object that is connection with new
        //                      language
        linkTo: function(ln, to) {
          var ref = this.getMeta(to);
          if (ref === null)
            throw 'You can only link to an existing language. Absent: ' + to;
          var meta = new Meta();
          meta.lex = ref.lex;
          meta.toc = ref.toc;
          meta.lang = ln;
          this.addMeta(meta);
          return meta;
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

    var supported  = /add|wj|nd|qt|dc/;

    var valid      = /\\\+?(\w+)\*?/;
    var ignored    = /zw|zws|zx|zwm/;  // hayk:todo b, q are temporary added
    var translator = /add/;
    var addition   = /dc/;
    var jesusWord  = /wj/;
    var discovered = {};

    // tags that do not have a closing pair, value is a simbol that is used in USFM format
    var single    = {};
    single[TAG.P] = LF;
    single[TAG.B] = LF;
    single[TAG.Q] = LF;

    function meetTag(tag) {
      var ref = discovered[tag];
      if (_.isUndefined(ref)) {
        discovered[tag] = {count: 1};
        return;
      }
      ref.count++;
    }

    return {
      // @param {string} tag  usfm tag, like this \tag, \+tag, \tag*
      // @returns             true if the specified tag is supported by the
      //                      application, otherwise false
      isSupported: function(tag) {
        meetTag(tag);
        //return ignored.test(tag) === false;
        return supported.test(tag) === true;
      },

      // @returns   true for tags that are marked to be ignored
      isIgnored: function(tag) {
        meetTag(tag);
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
        return _.isUndefined(single[tag]);
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

      // @returns  an object containting all unique tags that are discovered
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
    this.parent  = null;
    this.number  = 0;
    this.verses  = [];
    this.markups = {};
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
    //
    //
    // @param {[type]} node [description]
    // @param {[type]} pos  [description]
    //
    addMarkup: function(node, pos) {
      if (_.isUndefined(pos))
        pos = this.verses.length;

      if (_.isUndefined(this.markups[pos])) {
        this.markups[pos] = [];
      }
      this.markups[pos].push(node);
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
    this.te       = new TocEntry('', '', '', '', '');
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
    this.lang    = '';
    this.toc     = new TableOfContents([]);
  };

  // @returns  Representation of the bible rendered with the give renderer
  Bible.prototype.render = function(renderer) {
    return renderer.renderBible(this);
  };

  // @returns  Number of book in the Bible
  Bible.prototype.numBooks = function() {
    return this.books.length;
  };

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

  // @returns bible book object with specified id
  Bible.prototype.getBook = function(id) {
    var ref = this.ids[id];
    if (_.isUndefined(ref))
      return null;
    return this.books[ref];
  };

  // @returns bible table of content object
  Bible.prototype.getToc = function() {
    return this.toc;
  };


  /*------------------------------------------------------------------------*/


  // @brief  Create parser object
  // @param  supportedOnly  the parser will collect only tags that we support
  //                        list of supported tags are controlled by TH module
  var Parser = function(supportedOnly) {
    this.supportedOnly = supportedOnly;
    this.vre = /(\\\+?(\w+)\*?)\s?/gm;

    var verserBreak     = {};
    verserBreak[TAG.B]  = 1;
    verserBreak[TAG.P]  = 1;
    verserBreak[TAG.Q]  = 1;
    verserBreak[TAG.IE] = 1;
    verserBreak[TAG.V]  = 1;

    // deal with child nodes
    var childTextNode = function (node, str, from, to) {
      var text = str.substring(from, to);
      if (text.length > 0) {
        node.addChild(NH.createText(text));
      }
    };

    var extractHeader = function(header, book) {
      // extract book headers
      var re = /(\\\w+)\s+?(.*)/gm;
      var arr = null;
      while ((arr = re.exec(header)) !== null) {
        var tag = TH.name(arr[1]);
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
      if (!BBM.instance().existsId(book.te.id))
        throw 'Invalid book id: ' + book.te.id;
      book.index = BBM.instance().onById(book.te.id);
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

          var tag = TH.name(arr[1]);
          if (TH.isOpening(arr[1])) {
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

    var that  = this;

    function buildVerse(vn, vstr, chap) {
      if (vn !== 0) {
        var v = that.parseVerse(vstr);
        v.number = vn;
        vn = 0;
        chap.addVerse(v);
        vstr = '';
      }
    }

    // helps to perform chapter parsing
    this.parseChapterImpl = function(str, chap) {
      var vstr = '', vn = 0, arr = null, tag;
      var re = /^(\\\w+\d?)((\s+)(\d+))?/gm;

      // process chapter line by line
      var lines = str.match(/[^\r\n]+/g);

      lines.forEach(function(line) {
        re.lastIndex = 0;
        arr = re.exec(line);
        if (arr === null) {
          vstr += line + ' ';
        }
        else {
          tag = TH.name(arr[1]);
          if (_.isUndefined(verserBreak[tag]))
            vstr += line + ' ';
          else {
            buildVerse(vn, vstr, chap);
            vstr = '';
            vn = 0;
            if (TAG.V === tag) {
              // start a new verse
              vn = parseInt(arr[4]);
              vstr = line.substring(arr[0].length) + ' ';
            }
            else {
              var node = NH.createTag(tag);
              chap.addMarkup(node);
            }
          }
        }
      });
      buildVerse(vn, vstr, chap);
    };

    /*
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
          if (TH.name(arr[2]) === TAG.P) {
            np = true;
          }
        }
        verseStart = re.lastIndex;
        if (arr === null)
          return;
      }
    };*/

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

  // @param {string} str  string in a USFM format
  Parser.prototype.parseVerse = function(str) {
    // extract verse number if it is provided

    var vn  = 0;
    var re  = /\\v\s(\d+)/g;
    var arr = re.exec(str);
    var tmp = str;
    if (arr !== null) {
      vn = parseInt(arr[1]);
      tmp = str.substring(re.lastIndex);
    }

    // get rid of CR (carriage return) character, and replace
    // LF (line feed) characters with space
    tmp = tmp.replace(/\r/gm, '')
             .replace(/\n|¶/gm, ' ')
             .replace(/\s{2,}/gm, ' ')
             .trim();

    this.vre.lastIndex = 0;
    var verse = new Verse();
    this.parseVerseImpl(tmp, verse.node);
    verse.node.normalize();
    verse.number = vn;
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
    var arr = /^(\d+)-(\w{3})(\w{2,3})-(\w+)/g.exec(file);
    if (arr !== null) {
      return {
        on: parseInt(arr[1]),
        id: arr[2].toUpperCase(),
        lang: arr[3].toLowerCase(),
        bibleAbbr: arr[4].toUpperCase()
      };
    }

    if (!strict) {
      arr = /^(\d+)-(\w{3})/g.exec(file);
      if (arr !== null) {
        return {
          on: parseInt(arr[1]),
          id: arr[2].toUpperCase()
        };
      }
    }

    return null;
  }

  // Scan directory and guess BBM mapping that is used to save books
  //
  // @param  {string} dir directory to scan
  // @return {array}      array, that is similar to idsmap array, but containg
  //                      recognized mapping. Empty array will be returned if
  //                      no mapping was recognized
  function guessBBM(dir) {
    // preparing to load books
    dir        = path.normalize(dir + '/');
    var files  = fs.readdirSync(dir, 'utf8');
    var guess  = [];

    files.forEach(function(file) {
      try {
        var info = decodeFileName(file, false);
        if (info !== null) {
          guess.push({
            id: info.id,
            index: info.on,
            type: BBM.instance().itemById(info.id).type
          });
        }
      }
      catch (e) {
        log.error('"%s" file processing failed. Error: %s', file, e);
      }
    });

    return guess;
  }

  // Helper function, that fill opts default values of missing options
  function fillMissingOptions(opts) {
    if (_.isUndefined(opts)) {
      opts = {};
    }

    // setup default values for options missing entities
    if (_.isUndefined(opts.supportedOnly))
      opts.supportedOnly = true;
    if (_.isUndefined(opts.strictFilename))
      opts.strictFilename = true;
    if (_.isUndefined(opts.lang))
      opts.lang = '';
    if (_.isUndefined(opts.tocOverwrite))
      opts.tocOverwrite = true;
    if (_.isUndefined(opts.extension))
      opts.extension = '.usfm';

    return opts;
  }

  // Load bible book from the specified file and construct Book object
  //
  // @param  {string} file   Name of file containing Bible book in a usfm format
  // @param  {object} opts   Control book loader behaviour with various options
  // @param  {object} parser Parser object to reuse
  // @return {object}        Book object
  //
  function loadBook(file, opts, parser) {
    opts = fillMissingOptions(opts);
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
    opts = fillMissingOptions(opts);

    // preparing to load books
    dir        = path.normalize(dir + '/');
    var files  = fs.readdirSync(dir, 'utf8');
    var bible  = new Bible();
    var parser = new Parser(opts.supportedOnly);

    files.forEach(function(file) {
      // skip files with unknown extension
      if (path.extname(file).toLowerCase() !== opts.extension)
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
        //throw e;
      }
    });

    if (opts.strictFilename === true) {
      // tocOverwrite controls the method of population of bible.toc
      // if `true` all entries will be overwritten with values from appropriate
      // meta object
      var meta = MC.instance().getMeta(bible.lang);
      if (meta !== null)
        bible.toc.populate(meta.toc, opts.tocOverwrite);
      else
        log.warn('Meta object for language `%s` is missing.', bible.lang);
    }
    return bible;
  }

  // Save bible book to the in a specified directory according to save rules
  //
  // @param  {object} book   Bible book to be stored
  // @param  {object} opts   Save options
  // @param  {string} dir    Directory to save book as a usfm file
  var saveBook = function(book, dir, opts) {
    if (_.isUndefined(opts)) {
      opts = {};
    }

    if (_.isUndefined(opts.strictFilename))
      opts.strictFilename = true;
    if (_.isUndefined(opts.renderer))
      opts.renderer = new USFMRenderer();
    if (_.isUndefined(opts.extension))
      opts.extension = '.usfm';

    dir = path.normalize(path.join(dir, '/'));
    mkdirp.sync(dir);

    var bible = book.parent;
    var lang  = bible.lang;
    var abbr  = bible.abbr.toLowerCase();

    var qualifiedName = _.padLeft(BBM.instance().onById(book.te.id), 2, '0') + '-' + book.te.id;
    if (opts.strictFilename === true) {
      qualifiedName += lang;
      qualifiedName += '-';
      qualifiedName += abbr;
    }
    qualifiedName += opts.extension;

    var content = book.render(opts.renderer);
    fs.writeFileSync(dir + qualifiedName, content);
  };

  // Save bible books to the specified directory according to save rules
  //
  // @param  {object} bible  Bible object to be stored
  // @param  {object} opts   Save options
  // @param  {string} dir    Directory to save usfm files
  var saveBible = function(bible, dir, opts) {
    bible.books.forEach(function(book) {
      saveBook(book, dir, opts);
    });
  };


  /*------------------------------------------------------------------------*/


  var Renderer = function() {
  };

  // These functions `SHOULD BE` overridden in the derived classes

  Renderer.prototype.defineTagView     = function(obj) { throw 'implement defineTagView!'; };
  Renderer.prototype.defineVerseView   = function(obj) { throw 'implement defineVerseView!'; };
  Renderer.prototype.defineChapterView = function(obj) { throw 'implement defineChapterView!'; };
  Renderer.prototype.defineBookView    = function(obj) { throw 'implement defineBookView!'; };


  // These functions `SHOULD NOT` be overridden in the derived classes
  Renderer.prototype.renderNode    = function(node, depth)  {
    var res = '';
    var o = {
      tag: '',
      open: '',
      close: '',
      nested: false,
      renderable: true
    };

    if (NH.isText(node))
      res += node.text;
    else {
      if (node.tag !== '') {
        o.tag = node.tag;
        o.nested = depth > 2;
        this.defineTagView(o);

        // skip tag if the renderer have no clue how to render it
        if (o.renderable) {
          res += o.open;
        }
      }
    }

    if (o.renderable && node.haveChild())
      res += this.renderNode(node.first, depth + 1);
    res += o.close;

    if (node.haveNext())
      res += this.renderNode(node.next, depth);
    return res;
  };

  // @todo:comment
  Renderer.prototype.renderVerse = function(verse) {
    var o = {
      verse: verse,
      begin: '',
      end: '',
      id: ''
    };
    this.defineVerseView(o);
    return o.id + this.renderNode(verse.node, 1) + o.end;
  };

  // @todo:comment
  Renderer.prototype.renderChapter = function(chapter) {
    var o = {
      chapter: chapter,
      end: '',
      id: ''
    };
    this.defineChapterView(o);
    var res = o.id, self = this;

    chapter.verses.forEach(function(v) {
      var nodes = chapter.markups[v.number - 1];
      if (!_.isUndefined(nodes)) {
        nodes.forEach(function(node) {
          res += self.renderNode(node, 1);
        });
      }
      res += self.renderVerse(v);  // or v.render(self);
    });
    return res + o.end;
  };

  // @todo:comment
  Renderer.prototype.renderBook    = function(book) {
    var o = {
      book: book,
      header: '',
      end: ''
    };
    this.defineBookView(o);
    var res = o.header;
    var self = this;
    book.chapters.forEach(function(c) {
      res += self.renderChapter(c);  // or c.render(self);
    });
    return res + o.end;
  };

  // @todo:comment
  Renderer.prototype.renderBible   = function(bible) {
    var res = '';
    var self = this;
    bible.books.forEach(function(b) {
      res += self.renderBook(b);  // b.render(self)
    });
    return res;
  };


  /*------------------------------------------------------------------------*/

  var USFMRenderer = function() {
    Renderer.call(this);
  };
  inherit(USFMRenderer, Renderer);

  USFMRenderer.prototype.defineTagView = function(obj) {
    if (!TH.haveClosing(obj.tag)) {
      obj.open  = '\\' + obj.tag;
      obj.close = LF;
    }
    else {
      var tmp   = '\\' + (obj.nested ? '+' : '') + obj.tag;
      obj.open  = tmp + ' ';
      obj.close = tmp + '*';
    }
  };

  USFMRenderer.prototype.defineVerseView = function(obj) {
    obj.end = LF;
    obj.id  = '\\' + TAG.V + ' ' + obj.verse.number + ' ';
  };

  USFMRenderer.prototype.defineChapterView = function(obj) {
    obj.id  = '\\' + TAG.C + ' ' + obj.chapter.number + LF;
  };

  USFMRenderer.prototype.defineBookView = function(obj) {
    var book = obj.book;
    var res = '';
    res += '\\' + TAG.ID   + ' ' + book.te.id   + ' ' + book.te.name + LF;
    res += '\\' + TAG.H    + ' ' + book.te.name + LF;
    res += '\\' + TAG.TOC1 + ' ' + book.te.desc + LF;
    res += '\\' + TAG.TOC2 + ' ' + book.te.name + LF;
    res += '\\' + TAG.TOC3 + ' ' + book.te.abbr + LF;
    res += '\\' + TAG.MT   + ' ' + book.te.desc + LF;
    obj.header = res;
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

  TextRenderer.prototype.renderableTag = function(tag) {
    return TH.isSupported(tag);
  };

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

  TextRenderer.prototype.renderVerseBegin = function(verse) {
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

  TextRenderer.prototype.renderChapterEnd = function(chap) {
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
  exports.Lexical         = Lexical;
  exports.TH              = TH;
  exports.MC              = MC;


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
  exports.saveBible       = saveBible;
  exports.decodeFileName  = decodeFileName;
  exports.guessBBM        = guessBBM;

  exports.inherit         = inherit;

}.call(this));

require('../config').logFileLoading(__filename);


