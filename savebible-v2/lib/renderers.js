;(function() {
  'use strict';

  var _       = require('lodash');
  //var lb      = require('./bible.js');
  var cmn     = require('./common.js');
  var inherit = require('./inherit.js').inherit;

  /*------------------------------------------------------------------------*/


  var TAG = cmn.TAG;
  var NH  = cmn.NH;
  var TH  = cmn.TH;
  var NL  = cmn.NL;


  /*------------------------------------------------------------------------*/
  /*                                TagView                                 */
  /*------------------------------------------------------------------------*/

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
      var vo      = this.template();
      vo.tag      = tag;
      vo.nested   = false;
      this.renderer_.defineTagView(vo);

      var von     = this.template();
      von.tag     = tag;
      von.nested  = true;
      this.renderer_.defineTagView(von);
      ref = [von, vo];

      this.tvs_[tag] = ref;
    }
    return nested === true ? ref[0] : ref[1];
  };


  /*------------------------------------------------------------------------*/
  /*                              Renderer                                  */
  /*------------------------------------------------------------------------*/

  // Final view of the rendered bible depends on the user defined
  // functions below
  var Renderer = function() {
    this.tagView_  = new TagView(this);
    this.indented_ = false;
  };

  // These functions `SHOULD BE` overridden in the derived classes
  // Every renderer should define
  //
  // [defineTagView]
  // 1. opening and closing tag view string for a given tag
  // 2. consider `nested` attribute if required
  // 3. set `renderable` attribute
  // 4. set `newline` flag if the tag should be displayed on the new line
  //
  // [getNumberView]
  // 1. returns string that is define the view of given that with given number
  //
  // [getTextView]
  // 1. returns string that is define the view of given text
  //
  Renderer.prototype.defineTagView     = function(vo)          { throw new Error('implement defineTagView!'); };
  Renderer.prototype.getNumberView     = function(tag, number) { throw new Error('implement defineNumberView!'); };
  Renderer.prototype.getTextView       = function(text)        { throw new Error('implement getTextView!'); };


  // These functions `SHOULD NOT` be overridden in the derived classes
  Renderer.prototype.renderNode = function(node, depth, vrd) {
    var res = '';

    // get default template for verse object
    var vo = this.tagView_.template();

    if (NH.isText(node)) {
      res += this.getTextView(node.text);
    }
    else {
      if (node.tag !== '') {
        if (node.tag === TAG.V) {
          vrd = 0;
        }

        // retrieve tag view, that should be defined by concrete renderer
        vo = this.tagView_.get(node.tag, vrd > 1);

        // nice formatted output
        if (vo.newline === true && depth > 0) {
          res += NL;
          if (this.indented_ === true)
            res += _.pad('', 3 * (depth - 1));
        }

        // skip tag if the renderer have no clue how to render it
        if (vo.renderable) {
          res += vo.open;

          if (!_.isUndefined(node.number)) {
            res += this.getNumberView(node.tag, node.number);
          }
        }
      }
    }

    if (vo.renderable && node.haveChild()) {
      res += this.renderNode(node.first, depth + 1, vrd + 1);
      if (depth === 0)
        res = res.trimLeft();
    }

    if (this.indented_ === true && NH.isTag(node)) {
      res += NL;
      res += _.pad('', 3 * (depth - 1));
    }
    res += vo.close;

    if (node.haveNext())
      res += this.renderNode(node.next, depth, vrd);
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
    return vo.id + this.renderNode(verse.node, 1) +
           this.tagView_.get(TAG.V, false).close;
  };

  // @brief    render given chapter based on the renderer configuration
  // @returns  string containing the rendered chapter
  Renderer.prototype.renderChapter = function(chapter) {
    var vo = {
      chapter: chapter,
      id: '',
      verseSeparator: NL
    };
    this.defineChapterView(vo);
    var res = vo.id, self = this;

    chapter.verses.forEach(function(v) {
      // res += self.getVerseBegin(v);
      var nodes = chapter.markups[v.number - 1];
      if (!_.isUndefined(nodes)) {
        nodes.forEach(function(node) {
          res += self.closePendingTags(node.tag);
          self.pendingTags_.push(node.tag);
          res += self.renderNode(node, 1);
        });
      }
      if (res.length !== 0)
        res += vo.verseSeparator;
      res += v.render(self);
    });

    res += this.tagView_.get(TAG.C, false).close;
    return res;
  };

  // @brief    render given book based on the renderer configuration
  // @returns  string containing the rendered book
  Renderer.prototype.renderBook    = function(book) {
    var res = '';
    var vo = {
      book: book,
      header: '',
      chapterSeparator: NL
    };
    this.defineBookView(vo);
    res += vo.header;
    var self = this;
    book.chapters.forEach(function(c) {
      if (res.length !== 0)
        res += vo.chapterSeparator;
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
        case TAG.P:
        case TAG.Q:
          return;
      }
      vo.open += ' ';
    }
    else {
      var tmp   = '\\' + (vo.nested ? '+' : '') + vo.tag;
      vo.open  = tmp + ' ';
      vo.close = tmp + '*';
      vo.newline = false;
    }
  };

  USFMRenderer.prototype.getNumberView = function(tag, number) {
    return number + (tag === TAG.V ? ' ' : '');
  };

  USFMRenderer.prototype.getTextView = function(text) {
    return text;
  };

  // USFMRenderer.prototype.defineBookView = function(vo) {
  //   var book = vo.book;
  //   var res = '';
  //   res += '\\' + TAG.ID   + ' ' + book.te.id   + ' ' + book.te.name + NL;
  //   res += '\\' + TAG.H    + ' ' + book.te.name + NL;
  //   res += '\\' + TAG.TOC1 + ' ' + book.te.desc + NL;
  //   res += '\\' + TAG.TOC2 + ' ' + book.te.name + NL;
  //   res += '\\' + TAG.TOC3 + ' ' + book.te.abbr + NL;
  //   res += '\\' + TAG.MT   + ' ' + book.te.desc;
  //   vo.header = res;
  // };


  var IndentedUSFMRenderer = function() {
    USFMRenderer.call(this);
    this.indented_ = true;
  };
  inherit(IndentedUSFMRenderer, USFMRenderer);

  IndentedUSFMRenderer.prototype.getTextView = function(text) {
    return '<' +  text + '>';
  };

  IndentedUSFMRenderer.prototype.defineTagView = function(vo) {
    if (!TH.haveClosing(vo.tag)) {
      vo.newline = true;
      vo.open = '\\' + vo.tag;
      vo.close = vo.open + '*';

      switch (vo.tag) {
        case TAG.P:
        case TAG.Q:
          return;
      }
      vo.open += ' ';
    }
    else {
      var tmp    = '\\' + (vo.nested ? '+' : '') + vo.tag;
      vo.open    = tmp + ' ';
      vo.close   = tmp + '*';
      vo.newline = true;
    }
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
    this.textOnly   = opts.textOnly;
    this.renderable = /^(add|wj|nd|qt|dc|p|q|c|v)$/;
    this.isRenderable = function(tag) {
        return this.renderable.test(tag) === true;
    };
    Renderer.call(this);
  };
  inherit(TextRenderer, Renderer);

  TextRenderer.prototype.defineTagView = function(vo) {
    if (vo.tag === '')
      return;

    vo.renderable = this.isRenderable(vo.tag);
    // if (!vo.renderable)
    //   console.log('%s: is %s', vo.tag, vo.renderable ? 'renderable' : 'not renderable');

    if (vo.renderable === true) {
      if (!TH.haveClosing(vo.tag)) {
        vo.newline = true;
        switch (vo.tag) {
        case TAG.P:
        case TAG.Q:
          vo.newline = false;
          break;
        case TAG.C:
          vo.newline = (this.textOnly !== true);
        }
      }

      if (TH.isTranslator(vo.tag)) {
        vo.open  = '[';
        vo.close = ']';
      }
    }
  };

  TextRenderer.prototype.getNumberView = function(tag, number) {
    if (!this.textOnly)
      return number + (tag === TAG.V ? ' ' : '');
    return '';
  };

  TextRenderer.prototype.getTextView = function(text) {
    return text;
  };


  /*------------------------------------------------------------------------*/
  /*                          Pretty Renderer                               */
  /*------------------------------------------------------------------------*/

  var PrettyRenderer = function() {
    TextRenderer.call(this, {textOnly: false});

    var src = this.renderable.source;
    var pos = src.length - 2;
    var regexNewSource = src.substr(0, pos) + '|toc2' + src.substr(pos);
    this.renderable = new RegExp(regexNewSource);
  };

  inherit(PrettyRenderer, TextRenderer);

  PrettyRenderer.prototype.defineTagView = function(vo) {
    TextRenderer.prototype.defineTagView.call(this, vo);

    if (vo.renderable === true && vo.tag === TAG.TOC2) {
      vo.open = '== ';
      vo.close = ' ==';
    }

    // if (vo.tag === '')
    //   return;

    // vo.renderable = this.isRenderable(vo.tag);
    // if (!vo.renderable)
    //   console.log('%s: is %s', vo.tag, vo.renderable ? 'renderable' : 'not renderable');

    // if (vo.renderable === true) {
    //   if (!TH.haveClosing(vo.tag)) {
    //     vo.newline = true;
    //     switch (vo.tag) {
    //     case TAG.P:
    //     case TAG.Q:
    //       vo.newline = false;
    //       break;
    //     case TAG.C:
    //       vo.newline = (this.textOnly !== true);
    //     }
    //   }

    //   if (TH.isTranslator(vo.tag)) {
    //     vo.open  = '[';
    //     vo.close = ']';
    //   }
    // }
  };

  PrettyRenderer.prototype.getNumberView = function(tag, number) {
    if (tag === TAG.V) {
      return _.padRight(number, 3, ' ');
    }
    else if (tag === TAG.C) {
      return '\r\n=== ' + number + ' ===\r\n';
    }
    return '';
  };

  // PrettyRenderer.prototype.defineVerseView = function(vo) {
  //   if (!this.textOnly)
  //     vo.id = _.padRight(vo.verse.vn(), 3, ' ');
  // };

  // PrettyRenderer.prototype.defineChapterView = function(vo) {
  //   vo.id = '=== ' + vo.chapter.number + ' ===\r\n';
  // };

  // PrettyRenderer.prototype.defineBookView = function(vo) {
  //   vo.header = '== ' + vo.book.te.name + ' ==' + '\r\n';
  // };


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

  exports.Renderer             = Renderer;
  exports.USFMRenderer         = USFMRenderer;
  exports.IndentedUSFMRenderer = IndentedUSFMRenderer;
  exports.TextRenderer         = TextRenderer;
  exports.PrettyRenderer       = PrettyRenderer;
  exports.HTMLRenderer         = HTMLRenderer;

})();
