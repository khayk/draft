var lb   = require('../lib/bible');
var rndr = require('../lib/renderers');
var cfg  = require('../config').cfg;
var path = require('path');
var cmn  = require('../lib/common');
var fs   = require('fs-extra');

// var _      = require('lodash');
// var help   = require('../helpers');
// var cfg    = require('../config').cfg;
// var log    = require('log4js').getLogger('tls');
// var measur = new help.Measurer();

var opts = [
  //{folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     },
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  {getCombined: true, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];

var name = 'en-kjv-usfm';

var input  = cfg.bibleDir(name).from;
var output = cfg.bibleDir(name).to;

lb.MC.instance().linkTo('eng', 'en');
var bible = lb.loadBible(input, {types: [1, 2]});

// var comb1 = lb.saveBible(output, bible, opts[0]);
// var comb2 = '';


var BookIterator = function(bible) {
  var book = null;
  return {
    next: function() {
      if (book === null) {
        book = bible.firstBook();
        return book;
      }
      book = book.next();
      return book;
    }
  };
};


var bi = new BookIterator(bible);
var b = null;
var count = 0;

while ((b = bi.next()) !== null) {
  ++count;
}
console.log('Books count: %d', count);


var ChapterIterator = function(bible) {
  var book = null;
  var chap = null;

  return {
    next_v2: function() {
      chap = (chap !== null ? chap.next() : null);
      if (chap === null) {
        if (book === null)
          book = bible.firstBook();
        else
          book = book.next();
        if (book === null)
          return null;
        chap  = book.getChapter(1);
        if (chap !== null)
          return chap;
      }
      return this.next_v2();
    },

    next: function() {
      if (book === null) {
        book = bible.firstBook();
        if (book === null)
          return null;
        chap = book.getChapter(1);
        if (chap !== null)
          return chap;
      }

      if (chap === null) {
        book = book.next();
        if (book === null)
          return null;
        chap = book.getChapter(1);
        if (chap !== null)
          return chap;
      }

      chap = chap.next();
      if (chap !== null)
        return chap;
      return this.next();
    }
  };
};

var ChapterIterator = function(bible) {
  var book  = bible.firstBook();
  var chap  = (book !== null ? book.getChapter(1) : null);

  return {
    next: function() {
      chap = (chap !== null ? chap.next() : null);
      if (chap === null) {
        book = book.next();
        if (book === null)
          return null;
        chap = book.getChapter(1);
      }
      return chap;
    }
  };
};



var VerseIterator = function(bible) {
  var book  = bible.firstBook();
  var chap  = (book !== null ? book.getChapter(1) : null);
  var verse = (chap !== null ? chap.getVerse(1) : null);

  return {
    first: function() {
      return verse;
    },

    next: function() {
      verse = (verse !== null ? verse.next() : null);
      if (verse === null) {
        chap = chap.next();
        if (chap === null) {
          book = book.next();
          if (book === null)
            return null;
          chap  = book.getChapter(1);
        }
        verse = (chap !== null ? chap.getVerse(1) : null);
      }
      return verse;
    }
  };
};


it = iterator(bible);
while ((v = it.next()) !== null) {
  use(v);
}

var VerseIterator1 = function(bible) {
  var ci = new ChapterIterator(bible);

  var chap = ci.first();
  var verse = (chap !== null ? chap.getVerse(1) : null);

  return {
    first: function() {
      chap = ci.first();
      verse = (chap !== null ? chap.getVerse(1) : null);
    },

    next: function() {

    }
  };
};

var vi = new VerseIterator(bible);
var v = vi.first();
var rndr = new rndr.TextRenderer();

while (v !== null) {
  var str = v.render(rndr);
  comb2 += str + cmn.NL;
  v = vi.next();
}

console.log(comb1.length, comb2.length);

fs.writeFileSync(dir + 'comb1', comb1);
fs.writeFileSync(dir + 'comb2', comb2);