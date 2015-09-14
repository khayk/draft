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
  var NL  = cmn.NL;

  var TagView = function(renderer) {
    this.renderer_ = renderer;
    this.tvs_ = {};
  };

  TagView.prototype.template = function() {
    return {
      tag: '',          // [in]
      nested: false,    // [in]
      open: '',         // [out]
      close: '',        // [out]
      newline: false,   // [out] - default false
      renderable: true  // [out] - default true
    };
  };

  TagView.prototype.get = function(tag, nested) {
    var ref = this.tvs_[tag];

    if (_.isUndefined(ref)) {
      var vo = this.template();
      vo.tag = tag;
      vo.nested = false;
      this.renderer_.defineTagView(vo);

      var von = this.template();
      von.tag = tag;
      von.nested = true;
      this.renderer_.defineTagView(von);
      ref = [von, vo];

      this.tvs_[tag] = ref;
    }
    return nested === true ? ref[0] : ref[1];
  };

  // Final view of the rendered bible depends on the user defined
  // functions below
  var Renderer = function() {
    this.tagView_ = new TagView(this);
    this.pendingTags_ = [];
  };

  // These functions `SHOULD BE` overridden in the derived classes

  Renderer.prototype.defineTagView     = function(vo)    { throw new Error('implement defineTagView!'); };
  Renderer.prototype.defineVerseView   = function(vo)    { throw new Error('implement defineVerseView!'); };
  Renderer.prototype.defineChapterView = function(vo)    { throw new Error('implement defineChapterView!'); };
  Renderer.prototype.defineBookView    = function(vo)    { throw new Error('implement defineBookView!'); };

  // Renderer.prototype.getVerseBegin     = function(verse) { throw new Error('implement getVerseBegin!'); };
  // Renderer.prototype.getVerseEnd       = function(verse) { throw new Error('implement getVerseEnd!'); };
  // Renderer.prototype.getChapterBegin   = function(chap)  { throw new Error('implement getChapterBegin!'); };
  // Renderer.prototype.getChapterEnd     = function(chap)  { throw new Error('implement getChapterEnd!'); };
  // Renderer.prototype.getBookBegin      = function(book)  { throw new Error('implement getBookBegin!'); };
  // Renderer.prototype.getBookEnd        = function(book)  { throw new Error('implement getBookEnd!'); };


  // every renderer should define
  // 1. opening and closing tag view string for a given tag
  // 2. consider `nested` attribute if required
  // 3. set `renderable` attribute
  // 4. newline

  // 5. define separators, verseSeparator, chapterSeparator

  // these tags have no closing tag
  // \c, \v
  // \d, \p, \b, \q
  //
  // \d - closed as soon as encountered any of tags without closing tag
  //
  // \p - closed as soon as encountered \v or \p or \c or end of chapter
  // \q - closed as soon as encountered \v or \q    \c or end of chapter
  // \v - closed as soon as encountered \v or       \c or end of chapter
  // \c - closed as soon as encountered             \c or end of chapter

  Renderer.prototype.closePendingTags = function(currentTag) {
    var res = '';
    if (this.pendingTags_.length === 0)
      return res;

    for (var i = this.pendingTags_.length - 1; i >= 0; --i) {
      var tag = this.pendingTags_[i];
      var vo = this.tagView_.get(tag, false);
      var nlsymbol = vo.newline === true ? NL : '';
      var popTag = true;

      switch (tag) {
        case TAG.C:
          if (currentTag === TAG.C)
            res += nlsymbol + vo.close;
          break;

        case TAG.V:
          if (currentTag === TAG.V || currentTag === TAG.C)
            res += nlsymbol + vo.close;
          break;

        case TAG.Q:
          if (currentTag === TAG.V ||
              currentTag === TAG.Q ||
              currentTag === TAG.C)
            res += nlsymbol + vo.close;
          break;

        case TAG.P:
          if (currentTag === TAG.V ||
              currentTag === TAG.Q ||
              currentTag === TAG.P ||
              currentTag === TAG.C)
            res += nlsymbol + vo.close;
          break;

        case TAG.D:
          if (!TH.haveClosing(currentTag))
            res += nlsymbol + vo.close;
          break;

        default:
          popTag = false;
          break;
      }

      if (popTag)
        this.pendingTags_.pop();
    }
    return res;
  };

  // These functions `SHOULD NOT` be overridden in the derived classes
  Renderer.prototype.renderNode = function(node, depth) {
    var res = '';

    // get default template for verse object
    var vo = this.tagView_.template();

    if (NH.isText(node))
      res += node.text;
    else {
      if (node.tag !== '') {
        res += this.closePendingTags(node.tag);
        if (!TH.haveClosing(node.tag))
          this.pendingTags_.push(node.tag);

        // retrieve tag view, that should defined by a specific renderer
        vo = this.tagView_.get(node.tag, depth > 2);
        if (vo.newline)
          res += NL;

        // skip tag if the renderer have no clue how to render it
        if (vo.renderable) {
          res += vo.open;
        }
      }
    }

    if (vo.renderable && node.haveChild())
      res += this.renderNode(node.first, depth + 1);

    if (!TH.haveClosing(node.tag))
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
      // res += self.getVerseBegin(v);
      var nodes = chapter.markups[v.number - 1];
      if (!_.isUndefined(nodes)) {
        nodes.forEach(function(node) {
          res += self.renderNode(node, 1);
        });
      }
      res += v.render(self);
      // res += self.getVerseEnd(v);
    });
    return res;
  };

  // @brief    render given book based on the renderer configuration
  // @returns  string containing the rendered book
  Renderer.prototype.renderBook    = function(book) {
    var res = '';//this.getBookBegin(book);
    var vo = {
      book: book,
      header: '',
    };
    this.defineBookView(vo);
    res += vo.header;
    var self = this;
    book.chapters.forEach(function(c) {
      //res += self.getChapterBegin(c);
      res += c.render(self);
      //res += self.getChapterEnd(c);
    });
    //res += self.getBookEnd(book);
    return res;
  };

  // @brief    render given bible based on the renderer configuration
  // @returns  string containing the rendered bible
  Renderer.prototype.renderBible   = function(bible) {
    var res = '';
    var self = this;
    bible.books.forEach(function(b) {
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
      vo.newline = true;
      vo.open = '\\' + vo.tag;
      vo.close = '';

      switch (vo.tag) {
        case TAG.V:
        case TAG.C:
        case TAG.D:
          vo.open += ' ';
          break;
      }
    }
    else {
      var tmp   = '\\' + (vo.nested ? '+' : '') + vo.tag;
      vo.open  = tmp + ' ';
      vo.close = tmp + '*';
      vo.newline = false;
    }

    console.log(vo);
  };

  USFMRenderer.prototype.defineVerseView = function(vo) {
    vo.id = NL + this.tagView_.get(TAG.V, false).open + vo.verse.number + ' ';
  };


  USFMRenderer.prototype.defineChapterView = function(vo) {
    vo.id  = NL + this.tagView_.get(TAG.C, false).open + vo.chapter.number;
  };

  USFMRenderer.prototype.defineBookView = function(vo) {
    var book = vo.book;
    var res = '';
    res += '\\' + TAG.ID   + ' ' + book.te.id   + ' ' + book.te.name + NL;
    res += '\\' + TAG.H    + ' ' + book.te.name + NL;
    res += '\\' + TAG.TOC1 + ' ' + book.te.desc + NL;
    res += '\\' + TAG.TOC2 + ' ' + book.te.name + NL;
    res += '\\' + TAG.TOC3 + ' ' + book.te.abbr + NL;
    res += '\\' + TAG.MT   + ' ' + book.te.desc;
    vo.header = res;
  };

  // USFMRenderer.prototype.getVerseBegin = function(verse) {
  //   return NL;
  // };

  // USFMRenderer.prototype.getVerseEnd = function(verse) {
  //   return '';
  // };

  // USFMRenderer.prototype.getChapterBegin = function(chap) {
  //   return NL;
  // };

  // USFMRenderer.prototype.getChapterEnd = function(chap) {
  //   return '';
  // };

  // USFMRenderer.prototype.getBookBegin = function(book) {
  //   return '';
  // };

  // USFMRenderer.prototype.getBookEnd = function(book) {
  //   return NL;
  // };



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

  TextRenderer.prototype.defineVerseView = function(vo) {
    if (!this.textOnly)
      vo.id = vo.verse.id() + ' ';
  };

  TextRenderer.prototype.defineChapterView = function(vo) {
  };

  TextRenderer.prototype.defineBookView = function(vo) {
  };


  // TextRenderer.prototype.getVerseBegin = function(verse) {
  //   return NL;
  // };

  // TextRenderer.prototype.getVerseEnd   = function(verse) {
  //   return '';
  // };

  // TextRenderer.prototype.getChapterBegin = function(chap) {
  //   return '';
  // };

  // TextRenderer.prototype.getChapterEnd = function(chap)  {
  //   return '';
  // };

  // TextRenderer.prototype.getBookBegin = function(book) {
  //   return '';
  // };

  // TextRenderer.prototype.getBookEnd = function(book)  {
  //   return '';
  // };


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

  PrettyRenderer.prototype.defineChapterView = function(vo) {
    vo.id = '=== ' + vo.chapter.number + ' ===\r\n';
  };

  PrettyRenderer.prototype.defineBookView = function(vo) {
    vo.header = '== ' + vo.book.te.name + ' ==' + '\r\n';
  };

  // PrettyRenderer.prototype.getChapterBegin = function(chap) {
  //   return '\r\n\r\n';
  // };

  // PrettyRenderer.prototype.getBookBegin = function(book) {
  //   return '\r\n';
  // };


  /*------------------------------------------------------------------------*/
  /*                           HTML Renderer                                */
  /*------------------------------------------------------------------------*/

  var HTMLRenderer = function(opts) {
    Renderer.call(this, opts);

    //this.discoveredParagraphs = 0;
    this.paragraphTags = [];
    this.otherTags = [];

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
    var res;
    if (vo.tag === TAG.P) {
      res = this.htmlBuilder(vo.tag);
      this.paragraphTags.push(res.c);

      if (this.paragraphTags.length > 1) {
        vo.open += this.paragraphTags.pop();
        vo.open = vo.open + '\n' + res.o;
      }
      else {
        vo.open = res.o;
        vo.close = '';
      }
      vo.open = '\n' + vo.open;
      return;
    }

    var subst = this.tm[vo.tag];
    res  = this.htmlBuilder(subst.tag, subst.class);
    vo.open  = res.o;
    vo.close = res.c;
  };

  HTMLRenderer.prototype.defineVerseView = function(vo) {
    var res = this.htmlBuilder('span', 'verseNumber');
    vo.id   = res.o + vo.verse.number + res.c;
  };

  HTMLRenderer.prototype.defineChapterView = function(vo) {
    var res   = this.htmlBuilder('span', 'chapterNumber');
    vo.id  = res.o + vo.chapter.number + res.c;
  };

  HTMLRenderer.prototype.defineBookView = function(vo) {
  };

  // HTMLRenderer.prototype.getVerseBegin = function(verse) {
  //   return '\n';
  // };

  // HTMLRenderer.prototype.getVerseEnd = function(verse) {
  //   return '';
  // };
  // HTMLRenderer.prototype.getChapterBegin = function(chap) {
  //   this.discoveredParagraphs = 0;
  //   return '<br><br>';
  // };

  // HTMLRenderer.prototype.getChapterEnd = function(chap) {
  //   if (this.paragraphTags.length > 0)
  //     return this.paragraphTags.pop();
  //   return '';
  // };
  // HTMLRenderer.prototype.getBookBegin = function(book) {
  //   return '<html>\n<body>';
  // };

  // HTMLRenderer.prototype.getBookEnd = function(book) {
  //   return '</body>\n</html>\n';
  // };

  exports.Renderer        = Renderer;
  exports.USFMRenderer    = USFMRenderer;
  exports.TextRenderer    = TextRenderer;
  exports.PrettyRenderer  = PrettyRenderer;
  exports.HTMLRenderer    = HTMLRenderer;

})();
