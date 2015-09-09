;(function() {
  'use strict';

  var _       = require('lodash');
  var cfg     = require('../config').cfg;
  var lb      = require('./bible.js');
  var cmn     = require('./common.js');
  var inherit = require('./inherit.js').inherit;

  /*------------------------------------------------------------------------*/


  var TAG = cmn.TAG;
  var NH  = cmn.NH;
  var TH  = cmn.TH;
  var LF  = cmn.LF;


  // Final view of the rendered bible depends on the user defined
  // functions below
  var Renderer = function() {
  };

  // These functions `SHOULD BE` overridden in the derived classes

  Renderer.prototype.defineTagView      = function(vo)    { throw new Error('implement defineTagView!'); };
  Renderer.prototype.defineVerseView    = function(vo)    { throw new Error('implement defineVerseView!'); };
  Renderer.prototype.defineVerseBegin   = function(verse) { throw new Error('implement defineVerseBegin!'); };
  Renderer.prototype.defineVerseEnd     = function(verse) { throw new Error('implement defineVerseEnd!'); };
  Renderer.prototype.defineChapterView  = function(vo)    { throw new Error('implement defineChapterView!'); };
  Renderer.prototype.defineChapterBegin = function(chap)  { throw new Error('implement defineChapterBegin!'); };
  Renderer.prototype.defineChapterEnd   = function(chap)  { throw new Error('implement defineChapterEnd!'); };
  Renderer.prototype.defineBookView     = function(vo)    { throw new Error('implement defineBookView!'); };
  Renderer.prototype.defineBookBegin    = function(book)  { throw new Error('implement defineBookBegin!'); };
  Renderer.prototype.defineBookEnd      = function(book)  { throw new Error('implement defineBookEnd!'); };

  // These functions `SHOULD NOT` be overridden in the derived classes
  Renderer.prototype.renderNode    = function(node, depth)  {
    var res = '';
    var vo = {
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
        vo.tag = node.tag;
        vo.nested = depth > 2;
        this.defineTagView(vo);

        // skip tag if the renderer have no clue how to render it
        if (vo.renderable) {
          res += vo.open;
        }
      }
    }

    if (vo.renderable && node.haveChild())
      res += this.renderNode(node.first, depth + 1);
    res += vo.close;

    if (node.haveNext())
      res += this.renderNode(node.next, depth);
    return res;
  };

  // @brief    render given verse based on the renderer configuration
  // @returns  string containing the rendered verse
  Renderer.prototype.renderVerse = function(verse) {
    var vo = {
      verse: verse,
      id: ''
    };
    this.defineVerseView(vo);
    return vo.id + this.renderNode(verse.node, 1);
  };

  // @brief    render given chapter based on the renderer configuration
  // @returns  string containing the rendered chapter
  Renderer.prototype.renderChapter = function(chapter) {
    var vo = {
      chapter: chapter,
      id: ''
    };
    this.defineChapterView(vo);
    var res = vo.id, self = this;

    chapter.verses.forEach(function(v) {
      var nodes = chapter.markups[v.number - 1];
      if (!_.isUndefined(nodes)) {
        nodes.forEach(function(node) {
          res += self.renderNode(node, 1);
        });
      }
      res += self.defineVerseBegin(v);
      res += v.render(self);
      res += self.defineVerseEnd(v);
    });
    return res;
  };

  // @brief    render given book based on the renderer configuration
  // @returns  string containing the rendered book
  Renderer.prototype.renderBook    = function(book) {
    var vo = {
      book: book,
      header: '',
    };
    this.defineBookView(vo);
    var res = vo.header;
    var self = this;
    book.chapters.forEach(function(c) {
      res += self.defineChapterBegin(c);
      res += c.render(self);
    });
    return res;
  };

  // @brief    render given bible based on the renderer configuration
  // @returns  string containing the rendered bible
  Renderer.prototype.renderBible   = function(bible) {
    var res = '';
    var self = this;
    bible.books.forEach(function(b) {
      res += self.defineBookBegin(b);
      res += b.render(self);
    });
    return res;
  };


  /*------------------------------------------------------------------------*/
  /*                            USFM Renderer                               */
  /*------------------------------------------------------------------------*/


  // @brief  Predefined USFM renderer. Renders the bible in USFM format
  var USFMRenderer = function() {
    Renderer.call(this);
  };
  inherit(USFMRenderer, Renderer);

  USFMRenderer.prototype.defineTagView = function(vo) {
    if (!TH.haveClosing(vo.tag)) {
      vo.open  = '\\' + vo.tag;
      switch (vo.tag) {
        case TAG.P:
        case TAG.B:
        case TAG.Q:
          vo.open = LF + vo.open;
      }
    }
    else {
      var tmp   = '\\' + (vo.nested ? '+' : '') + vo.tag;
      vo.open  = tmp + ' ';
      vo.close = tmp + '*';
    }
  };

  USFMRenderer.prototype.defineVerseBegin = function(verse) {
    return LF;
  };

  USFMRenderer.prototype.defineVerseEnd = function(verse) {
    return '';
  };

  USFMRenderer.prototype.defineVerseView = function(vo) {
    vo.id  = '\\' + TAG.V + ' ' + vo.verse.number + ' ';
  };

  USFMRenderer.prototype.defineChapterBegin = function(chap) {
    return LF;
  };

  USFMRenderer.prototype.defineChapterEnd = function(chap) {
    return '';
  };

  USFMRenderer.prototype.defineChapterView = function(vo) {
    vo.id  = '\\' + TAG.C + ' ' + vo.chapter.number;
  };

  USFMRenderer.prototype.defineBookBegin = function(book) {
    return LF;
  };

  USFMRenderer.prototype.defineBookEnd = function(book) {
    return '';
  };

  USFMRenderer.prototype.defineBookView = function(vo) {
    var book = vo.book;
    var res = '';
    res += '\\' + TAG.ID   + ' ' + book.te.id   + ' ' + book.te.name + LF;
    res += '\\' + TAG.H    + ' ' + book.te.name + LF;
    res += '\\' + TAG.TOC1 + ' ' + book.te.desc + LF;
    res += '\\' + TAG.TOC2 + ' ' + book.te.name + LF;
    res += '\\' + TAG.TOC3 + ' ' + book.te.abbr + LF;
    res += '\\' + TAG.MT   + ' ' + book.te.desc;
    vo.header = res;
  };


  /*------------------------------------------------------------------------*/
  /*                            Text Renderer                               */
  /*------------------------------------------------------------------------*/

  // @brief  Predefined text renderer. Renders the bible in text format.
  //         Every verse will be started from the new line
  // @param {object} opts  control some view options in this renderer
  //                 to see book id chapter and verse number in front
  //                 of each verse, `textOnly` should be set to false
  var TextRenderer = function(opts) {
    if (!opts)
      opts = { textOnly: true };
    else if (typeof opts !== 'object')
      throw new TypeError('Bad arguments');
    this.textOnly = opts.textOnly;
    Renderer.call(this);
  };
  inherit(TextRenderer, Renderer);

  TextRenderer.prototype.defineTagView = function(vo) {
    vo.renderable = TH.isKnown(vo.tag);
    if (vo.renderable === true) {
      if (TH.isTranslator(vo.tag)) {
        vo.open  = '[';
        vo.close = ']';
      }
    }
  };

  TextRenderer.prototype.defineVerseBegin = function(verse) {
    return LF;
  };

  TextRenderer.prototype.defineVerseView = function(vo) {
    if (!this.textOnly)
      vo.id = vo.verse.id() + ' ';
  };

  TextRenderer.prototype.defineChapterBegin = function(chap) {
    return '';
  };

  TextRenderer.prototype.defineChapterView = function(vo) {
  };

  TextRenderer.prototype.defineBookBegin = function(book) {
    return '';
  };

  TextRenderer.prototype.defineBookView = function(vo) {
  };


  /*------------------------------------------------------------------------*/
  /*                          Pretty Renderer                               */
  /*------------------------------------------------------------------------*/

  var PrettyRenderer = function(opts) {
    TextRenderer.call(this, opts);
  };

  inherit(PrettyRenderer, TextRenderer);

  PrettyRenderer.prototype.defineVerseView = function(vo) {
    if (!this.textOnly)
      vo.id = _.padRight(vo.verse.vn(), 3, ' ');
  };

  PrettyRenderer.prototype.defineChapterBegin = function(chap) {
    return '\r\n\r\n';
  };

  PrettyRenderer.prototype.defineChapterView = function(vo) {
    vo.id = '=== ' + vo.chapter.number + ' ===\r\n';
  };

  PrettyRenderer.prototype.defineBookBegin = function(book) {
    return '\r\n';
  };

  PrettyRenderer.prototype.defineBookView = function(vo) {
    vo.header = '== ' + vo.book.te.name + ' ==' + '\r\n';
  };


  /*------------------------------------------------------------------------*/
  /*                           HTML Renderer                                */
  /*------------------------------------------------------------------------*/

  var HTMLRenderer = function(opts) {
    Renderer.call(this, opts);

    this.discoveredParagraphs = 0;
    this.htmlBuilder = function(tag, cls) {
      return {
        o: '<' + tag + (!_.isUndefined(cls) ? ' class="' + cls + '"' : '') + '>',
        c: '</' + tag + '>'
      };
    };

    // usfm tag to html tag mapping
    this.tm = {};
    this.tm[TAG.H]   = {tag: 'div', class: 'h'};
    this.tm[TAG.C]   = {tag: 'div', class: 'c'};
    this.tm[TAG.V]   = {tag: 'div', class: 'v'};
    this.tm[TAG.P]   = {tag: 'div', class: 'p'};

    this.tm[TAG.WJ]  = {tag: 'div', class: 'wj'};
    this.tm[TAG.ND]  = {tag: 'div', class: 'nd'};
    this.tm[TAG.QT]  = {tag: 'div', class: 'qt'};
    this.tm[TAG.ADD] = {tag: 'div', class: 'add'};
  };

  inherit(HTMLRenderer, Renderer);

  HTMLRenderer.prototype.defineTagView = function(vo) {
    var subst = this.tm[vo.tag];
    var res  = this.htmlBuilder(subst.tag, subst.class);
    if (vo.tag === TAG.P) {
      res = this.htmlBuilder(vo.tag);
      this.discoveredParagraphs++;
      if (this.discoveredParagraphs > 1) {
        vo.open = res.c + '\n' + res.o;
        //vo.close = res.c;
        this.discoveredParagraphs--;
      }
      else {
        vo.open = res.o;
        vo.close = '';
      }
      vo.open = '\n' + vo.open;
      return;
    }
    vo.open  = res.o;
    vo.close = res.c;
  };

  HTMLRenderer.prototype.defineVerseBegin = function(verse) {
    return '\n</br>';
  };

  HTMLRenderer.prototype.defineVerseView = function(vo) {
    var res   = this.htmlBuilder('span', 'verseNumber');
    vo.id  = res.o + vo.verse.number + res.c;
  };

  HTMLRenderer.prototype.defineChapterBegin = function(chap) {
    this.discoveredParagraphs = 0;
    return '</br>';
  };

  HTMLRenderer.prototype.defineChapterView = function(vo) {
    var res   = this.htmlBuilder('span', 'chapterNumber');
    vo.id  = '</br></br>' + res.o + vo.chapter.number + res.c;
  };

  HTMLRenderer.prototype.defineBookBegin = function(book) {
    return '</br>';
  };

  HTMLRenderer.prototype.defineBookView = function(vo) {
  };

  exports.Renderer        = Renderer;
  exports.USFMRenderer    = USFMRenderer;
  exports.TextRenderer    = TextRenderer;
  exports.PrettyRenderer  = PrettyRenderer;
  exports.HTMLRenderer    = HTMLRenderer;

})();
