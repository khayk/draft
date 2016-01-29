;(function() {
  'use strict';

  var _       = require('lodash');
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
    this.tvs_      = {};
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

  TagView.prototype.get = function(node, nested) {
    var tag = node.tag;
    var vo = null;

    if (this.renderer_.haveComplexView(node)) {
      vo = this.template();
      this.renderer_.defineComplexView(node, vo);
      return vo;
    }

    var ref = this.tvs_[tag];
    if (_.isUndefined(ref)) {
      vo          = this.template();
      vo.tag      = tag;
      vo.nested   = false;
      this.renderer_.defineTagView(vo);

      var von     = this.template();
      von.tag     = tag;
      von.nested  = true;
      this.renderer_.defineTagView(von);
      ref = [vo, von];

      this.tvs_[tag] = ref;
    }
    return nested === false ? ref[0] : ref[1];
  };


  /*------------------------------------------------------------------------*/
  /*                              Renderer                                  */
  /*------------------------------------------------------------------------*/

  // Final view of the rendered bible depends on the user defined
  // functions below
  var Renderer = function() {
    this.tagView_  = new TagView(this);
    this.indented_ = false;

    // it is not neccessary to provide all variables to the function, needed
    // only thoses which cannot be detected during render. For example, if
    // we want to render a specified chapter, we should call this function
    // with only `bid` argument, other parts will be detected during render
    this.setNavigation = function(bid, cn, vn) {
      // these are informative variables, which are designed to point what is
      // rendering at the moment, these can be freely used in every derived
      // renderer
      this.title_ = '';
      this.bid_   = bid || '';
      this.cn_    = cn || 0;
      this.vn_    = vn || 0;
    };

    this.updateNavigation = function(node) {
      if (node.tag === TAG.V) {
        this.vn_ = node.number;
      }
      else if (node.tag === TAG.C) {
        this.cn_ = node.number;
        this.vn_ = 0;
      }
      else if (node.tag === TAG.ID) {
        var tcn = NH.textChild(node);
        if (tcn !== null) {
          this.bid_ = tcn.text.match(/\w+/);
        }
      }
    };

    this.resetNavigation = function() {
      this.setNavigation();
    };

    this.resetNavigation();
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
  Renderer.prototype.getNumberView     = function(tag, number) { throw new Error('implement getNumberView!'); };
  Renderer.prototype.getTextView       = function(text)        { throw new Error('implement getTextView!'); };

  // ONLY special case should be processed by this function
  // normally the renderer should define tag view through defineTagView,
  // but if any node needs special processing it can be done with this function
  // on exit vo object filled with neccessary fields for custom processing
  Renderer.prototype.defineComplexView = function(node, vo)    { throw new Error('implement defineComplexView!'); };

  // you can overwrite this function to make rendering process of any tag
  // as flexible as you wish
  // @returns   true    if the tag have dynamic view
  //            false   if the tag have static view
  //
  // if function returns true
  Renderer.prototype.haveComplexView   = function(node) {
    if (node.tag === TAG.P)
      return NH.textChild(node) !== null;
    return false;
  };


  // These functions `SHOULD NOT` be overridden in the derived classes
  Renderer.prototype.renderNode = function(node, depth, vrd) {
    var res = '';

    // get default template for verse object
    var vo = this.tagView_.template();

    if (node.isText()) {
      res += this.getTextView(node.text);
    }
    else {
      this.updateNavigation(node);
      if (node.tag === TAG.V)
        vrd = 0;

      // retrieve tag view, that should be defined by concrete renderer
      vo = this.tagView_.get(node, vrd > 1);

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

    var child = node.firstChild();
    while (vo.renderable && child !== null) {
      res += this.renderNode(child, depth + 1, vrd + 1);
      child = child.getNext();
    }

    if (this.indented_ === true && node.isTag()) {
      res += NL + _.pad('', 3 * (depth - 1));
    }
    res += vo.close;
    if (depth === 0) {
      // reset all location values
      this.resetNavigation();
      return res.trimLeft();
    }
    return res;
  };



  // @brief    render given verse based on the renderer configuration
  // @returns  string containing the rendered verse
  Renderer.prototype.renderVerse = function(verse) {
    return this.renderNode(verse.node, 0, 0);
  };

  // @brief    render given chapter based on the renderer configuration
  // @returns  string containing the rendered chapter
  Renderer.prototype.renderChapter = function(chapter) {
    return this.renderNode(chapter.node, 0, 0);
  };

  // @brief    render given book based on the renderer configuration
  // @returns  string containing the rendered book
  Renderer.prototype.renderBook = function(book) {
    return this.renderNode(book.node, 0, 0);
  };

  // @brief    render given bible based on the renderer configuration
  // @returns  string containing the rendered bible
  Renderer.prototype.renderBible = function(bible) {
    var res = '';
    var self = this;
    bible.books.forEach(function(b) {
      res += b.render(self) + NL;
    });
    return res;
  };


  /*------------------------------------------------------------------------*/
  /*                            USFM Renderer                               */
  /*------------------------------------------------------------------------*/


  // @brief  Predefined USFM renderer. Renders the bible in USFM format
  // @param {array} ignoredTag   array of tags to ignore while rendering
  var UsfmRenderer = function(ignoredTags) {
    Renderer.call(this);

    // build ignored tags regular expression
    if (_.isArray(ignoredTags)) {
      var src = '';
      ignoredTags.forEach(function(tag) {
        if (src.length > 0)
          src += '|';
        src += tag;
      });
      this.ignored = new RegExp('^(' + src + ')$');
    }

    this.isIgnored = function(tag) {
      if (_.isUndefined(this.ignored))
        return false;
      return this.ignored.test(tag) === true;
    };
  };
  inherit(UsfmRenderer, Renderer);

  UsfmRenderer.prototype.defineComplexView = function(node, vo) {
    vo.tag = node.tag;
    this.defineTagView(vo);
    vo.open += ' ';
  };

  UsfmRenderer.prototype.defineTagView = function(vo) {
    if (vo.tag === '')
      return;

    vo.renderable = !this.isIgnored(vo.tag);
    if (!vo.renderable)
      return;

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

  UsfmRenderer.prototype.getNumberView = function(tag, number) {
    return number + (tag === TAG.V ? ' ' : '');
  };

  UsfmRenderer.prototype.getTextView = function(text) {
    return text;
  };


  /*------------------------------------------------------------------------*/
  /*                        Indented  USFM Renderer                         */
  /*------------------------------------------------------------------------*/


  var IndentedUsfmRenderer = function() {
    UsfmRenderer.call(this);
    this.indented_ = true;
  };
  inherit(IndentedUsfmRenderer, UsfmRenderer);

  IndentedUsfmRenderer.prototype.getTextView = function(text) {
    return '<' +  text + '>';
  };

  IndentedUsfmRenderer.prototype.defineTagView = function(vo) {
    if (vo.tag === '')
      return;

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

  TextRenderer.prototype.defineComplexView = function(node, vo) {
    vo.renderable = false;
  };

  TextRenderer.prototype.defineTagView = function(vo) {
    if (vo.tag === '')
      return;

    vo.renderable = this.isRenderable(vo.tag);
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
    if (this.textOnly === false)
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
    var regexNewSource = src.substr(0, pos) + '|' + TAG.TOC1 + src.substr(pos);
    this.renderable = new RegExp(regexNewSource);
  };

  inherit(PrettyRenderer, TextRenderer);

  PrettyRenderer.prototype.defineTagView = function(vo) {
    TextRenderer.prototype.defineTagView.call(this, vo);

    if (vo.renderable === true && vo.tag === TAG.TOC1) {
      vo.open = '== ';
      vo.close = ' ==' + NL;
    }
  };

  PrettyRenderer.prototype.getNumberView = function(tag, number) {
    if (tag === TAG.V) {
      return _.padEnd(number, 3, ' ');
    }
    else if (tag === TAG.C) {
      return NL + '=== ' + number + ' ===' + NL;
    }
    return '';
  };


  /*------------------------------------------------------------------------*/
  /*                           HTML Renderer                                */
  /*------------------------------------------------------------------------*/

  var HtmlRenderer = function(opts) {
    Renderer.call(this, opts);

    // @param {array} attributes   single attribute or an array of attributes
    //                             to be included in the tag, attribute must
    //                             be an object like {n: name, v: value}
    this.htmlBuilder = function(tag, attributes) {
      var attribsStr = '';

      if (_.isArray(attributes)) {
        attributes.forEach(function(attr) {
          attribsStr += ' ' + attr.n + '="' + attr.v + '"';
        });
      }
      else if(!_.isUndefined(attributes)) {
        attribsStr += ' ' + attributes.n + '="' + attributes.v + '"';
      }

      return {
        o: '<' + tag + attribsStr + '>',
        c: '</' + tag + '>'
      };
    };

    // usfm tag to html tag mapping
    this.tm = {};
    this.tm[TAG.H]   = {tag: 'div',  attrs: {n: 'class', v: 'h'}};
    this.tm[TAG.C]   = {tag: 'div',  attrs: {n: 'class', v: 'c'}};
    this.tm[TAG.V]   = {tag: 'span', attrs: {n: 'class', v: 'v'}};
    this.tm[TAG.P]   = {tag: 'div',  attrs: {n: 'class', v: 'p'}};

    this.tm[TAG.WJ]  = {tag: 'span', attrs: {n: 'class', v: 'wj'}};
    this.tm[TAG.ND]  = {tag: 'span', attrs: {n: 'class', v: 'nd'}};
    this.tm[TAG.QT]  = {tag: 'span', attrs: {n: 'class', v: 'qt'}};
    this.tm[TAG.ADD] = {tag: 'span', attrs: {n: 'class', v: 'add'}};
  };

  inherit(HtmlRenderer, Renderer);

  HtmlRenderer.prototype.haveComplexView = function(node) {
    if (Renderer.prototype.haveComplexView.call(this, node)) {
      return true;
    }

    // we want to render these tags in a special way
    if (node.tag === TAG.V || node.tag === TAG.C) {
      return true;
    }
    return false;
  };

  HtmlRenderer.prototype.defineComplexView = function(node, vo) {
    var id = '';
    if (node.tag === TAG.V) {
      id = this.bid_ + ' ' + this.cn_ + ':' + this.vn_;
    }
    else if (node.tag === TAG.C) {
      id = this.bid_ + ' ' + this.cn_;
    }

    if (id.length > 0) {
      vo.tag = node.tag;
      var attrsArray = [];
      var subst = this.tm[vo.tag];
      attrsArray.push(subst.attrs);
      attrsArray.push({n: 'id', v: id});
      vo.renderable = true;
      var res  = this.htmlBuilder(subst.tag, attrsArray);
      vo.open  = res.o;
      vo.close = res.c;
      vo.newline = true;
    }
    else {
      vo.renderable = false;
    }
  };

  HtmlRenderer.prototype.defineTagView = function(vo) {
    if (vo.tag === '') {
      vo.open =
          '<!doctype html>' + NL +
          '<html>' + NL +
          '<head>' + NL +
          '<link rel="stylesheet" type="text/css" href="style.css">' + NL +
          '<meta charset="utf-8" />' + NL +
          '</head>' + NL +
          '<body>';
      vo.close = NL + '</body>' + NL + '</html>' + NL;
      vo.renderable = true;
      return;
    }

    var subst = this.tm[vo.tag];
    if (_.isUndefined(subst)) {
      // @todo
      vo.renderable = false;
      return;
    }
    var res  = this.htmlBuilder(subst.tag, subst.attrs);
    vo.open  = res.o;
    vo.close = res.c;

    if (!TH.haveClosing(vo.tag))
      vo.newline = true;
  };

  HtmlRenderer.prototype.getNumberView = function(tag, number) {
    var res;
    if (tag === TAG.V)
      res = this.htmlBuilder('span', {n: 'class', v: 'verseNumber'});
    else {
      res = this.htmlBuilder('div', {n: 'class', v: 'chapterNumber'});
    }
    return res.o + number + res.c;
  };

  HtmlRenderer.prototype.getTextView = function(text) {
    var res = this.htmlBuilder('span');
    return res.o + text + res.c;
  };

  /*------------------------------------------------------------------------*/
  /*                                exports                                 */
  /*------------------------------------------------------------------------*/

  exports.Renderer             = Renderer;
  exports.UsfmRenderer         = UsfmRenderer;
  exports.IndentedUsfmRenderer = IndentedUsfmRenderer;
  exports.TextRenderer         = TextRenderer;
  exports.PrettyRenderer       = PrettyRenderer;
  exports.HtmlRenderer         = HtmlRenderer;

})();
