
/// <reference path ="../typings/mocha/mocha.d.ts"/>
/*eslint-env node, mocha */

var _       = require('lodash');
var expect  = require('chai').expect;
var path    = require('path');
var fs      = require('fs-extra');

var cfg     = require('../config').cfg;
var lb      = require('../lib/bible.js');
var search  = require('../lib/search-v2.js');
var inherit = require('../lib/inherit.js').inherit;
var cmn     = require('../lib/common.js');
var rndr    = require('../lib/renderers.js');
var tc      = require('./dataCreators.js');
var dusfm   = require('./dataUSFM.js');

var TH                   = cmn.TH;
var NH                   = cmn.NH;
var TAG                  = cmn.TAG;

var BBM                  = lb.BBM;
var MC                   = lb.MC;
var Stack                = lb.Stack;
var TocEntry             = lb.TocEntry;
var TableOfContents      = lb.TableOfContents;
var Verse                = lb.Verse;
var Chapter              = lb.Chapter;
var Book                 = lb.Book;
var Bible                = lb.Bible;
var Parser               = lb.Parser;
var Reference            = lb.Reference;

var Renderer             = rndr.Renderer;
var UsfmRenderer         = rndr.UsfmRenderer;
var TextRenderer         = rndr.TextRenderer;
var IndentedUsfmRenderer = rndr.IndentedUsfmRenderer;
var PrettyRenderer       = rndr.PrettyRenderer;
var HtmlRenderer         = rndr.HtmlRenderer;

var findBook             = lb.findBook;
var loadBible            = lb.loadBible;
var loadBook             = lb.loadBook;
var saveBible            = lb.saveBible;
var decodeFileName       = lb.decodeFileName;

var Dictionary           = search.Dictionary;
var Search               = search.Search;
var BibleSearch          = search.BibleSearch;


function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() +
           txt.substr(1).toLowerCase();
  });
}

/*------------------------------------------------------------------------*/


describe('module BBM', function() {
  var o = BBM.instance();
  var initialCount = o.numItems();


  it('interface', function() {
    expect(BBM.instance()).to.have.all.keys(
      'items',
      'itemById',
      'itemByOn',
      'numItems',
      'existsId',
      'onById',
      'idByOn',
      'ons',
      'ids',
      'firstId',
      'lastId',
      'nextId',
      'prevId');
  });


  it('content', function() {
    expect(initialCount).to.be.at.least(83);
    var bookId = 'REV';
    var gen    = o.itemById('GEN');
    var on     = o.onById(bookId);

    expect(gen).to.have.all.keys('id', 'index', 'type');
    expect(gen.index).to.equal(1);
    expect(gen.type).to.equal(1);
    expect(o.itemByOn(gen.index)).to.equal(gen);
    expect(o.existsId(bookId)).to.equal(true);

    expect(o.idByOn(on)).to.equal(bookId);
    expect(o.numItems()).to.equal(initialCount);

    var indices = [];
    _.each(o.ons(), function(val/*, key*/) {
      indices.push(val);
    });

    // expect to meet elements in an ascending order by member index
    var prev = null;
    indices.forEach(function(ind) {
      if (prev !== null) {
        var bbme = o.items()[ind];
        expect(prev).to.be.below(bbme.index);
        expect(o.ids()[bbme.id]).to.equal(ind);
      }
      else
        prev = ind;
    });

    // go back and forth in the BBM
    // move forward
    var id = 'GEN';
    var count = 0;
    while (id !== null) {
      id = BBM.instance().nextId(id);
      ++count;
    }
    expect(count).to.equal(BBM.instance().numItems());

    // move backward
    id = '2ES';
    while (id !== null) {
      id = BBM.instance().prevId(id);
      --count;
    }
    expect(count).to.equal(0);
  });


  it('immutability', function() {
    // the number of items should not be altered if queries missing item
    expect(o.itemById('NOT FOUND')).to.equal(null);
    expect(o.existsId('NONE')).to.equal(false);
    expect(o.onById('NONE')).to.equal(0);
    expect(o.idByOn(111)).to.equal(null);
    expect(o.nextId('NONE')).to.equal(null);
    expect(o.prevId('NONE')).to.equal(null);
    expect(o.numItems()).to.equal(initialCount);
  });


  it('invalid mapping', function() {
    var duplicateId = [
      {'id':'HEB', 'index':13, 'type':1},
      {'id':'HEB', 'index':70, 'type':2}
    ];

    var duplicateIndex = [
      {'id':'HEB', 'index':13, 'type':1},
      {'id':'GEN', 'index':13, 'type':2}
    ];

    var invalidType = [
      {'id':'GEN', 'index':13, 'type':0},
      {'id':'HEB', 'index':70, 'type':2}
    ];

    var validMapping = [
      {'id':'ONE', 'index':7, 'type':1},
      {'id':'TWO', 'index':5, 'type':2},
      {'id':'SIX', 'index':9, 'type':3}
    ];

    var defaultInstance = BBM.activate();

    var activator = function(mapping) {
      BBM.activate(mapping);
    };

    expect(activator.bind(activator, duplicateId)).to.throw('Duplicate book id in the ids mapping: HEB');
    expect(activator.bind(activator, duplicateIndex)).to.throw('Duplicate index found in ids mapping: 13');
    expect(activator.bind(activator, invalidType)).to.throw('Invalid Bible book mapping item type: 0');
    expect(activator.bind(activator, validMapping)).to.not.throw();

    var cid = BBM.instance().firstId();
    expect(cid).to.be.equal(validMapping[1].id);
    expect(BBM.instance().nextId(cid)).to.be.equal(validMapping[0].id);
    expect(BBM.instance().lastId()).to.be.equal(validMapping[2].id);

    // activate with empty mapping
    expect(activator.bind(activator, [])).to.not.throw();
    expect(BBM.instance().firstId()).to.be.equal(null);
    expect(BBM.instance().lastId()).to.be.equal(null);

    expect(BBM.activate()).to.be.equal(defaultInstance);
  });

  it('performance', function() {
    var id, count = 1000;
    for (var i = 0; i < count; ++i) {
      id = 'GEN';
      while (id !== null) {
        id = BBM.instance().nextId(id);
      }
    }
  });
});


/*------------------------------------------------------------------------*/


describe('module meta', function() {

  var en = '';
  var ru = '';
  var hy = '';
  // TODO: var puncts = '`!@?\'\",-_«»';

  // initialize language letters
  before(function() {
    function insert(str, index, value) {
      return str.substr(0, index) + value + str.substr(index);
    }

    var alphabetLength, firstLower, firstUpper, i, lo, hi;

    // english alphabet 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    alphabetLength = 26;
    firstLower = 0x61;  // english lowercase `a`
    firstUpper = 0x41;  // english capital `A`
    lo = hi = '';
    for (i = 0; i < alphabetLength; ++i) {
      lo += String.fromCharCode(firstLower + i);
      hi += String.fromCharCode(firstUpper + i);
    }
    en = lo + hi;


    //console.log(en);
    // russian alphabet 'абвгдеёжзийклмнопрстуфхцчшщьъыэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЬЪЫЭЮЯ';
    alphabetLength = 32;
    firstLower = 0x430;  // russian lowercase `a`
    firstUpper = 0x410;  // russian capital `A`
    lo = hi = '';
    for (i = 0; i < alphabetLength; ++i) {
      lo += String.fromCharCode(firstLower + i);
      hi += String.fromCharCode(firstUpper + i);
    }
    lo = insert(lo, 6, String.fromCharCode(0x451)); // append ё
    hi = insert(hi, 6, String.fromCharCode(0x401)); // append Ё
    ru = lo + hi;


    // armenian alphabet 'աբգդեզէըթժիլխծկհչղճմյնշոչպջռսվտրցւփքևօֆԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՉՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖ';
    alphabetLength = 38;
    firstLower = 0x561;  // armenian lowercase `ա`
    firstUpper = 0x531;  // armenian capital `Ա`
    lo = hi = '';
    for (i = 0; i < alphabetLength; ++i) {
      lo += String.fromCharCode(firstLower + i);
      hi += String.fromCharCode(firstUpper + i);
    }
    lo = insert(lo, 36, String.fromCharCode(0x587)); // append և
    hy = lo + hi;
  });

  it('loading', function() {
    var MCO = MC.instance();

    // first try to load invalid file, but before the try let's make one
    var invalidFileName = 'theMetaFile.json';
    fs.writeFileSync(invalidFileName, 'invalid json');
    expect(MCO.load.bind(MCO, '.')).to.throw();
    fs.unlinkSync(invalidFileName);

    MCO.load(path.join(cfg.mediaDir(), '../lib/meta'));
    var languages = MCO.getLanguages();

    var obj = {'ru': ru, 'en': en, 'hy': hy};

    _.each(obj, function(val, key) {
      var meta = MCO.getMeta(key);
      var lex  = meta.lex;
      var res = lex.removePunctuations(en + ru + hy);
      expect(res).to.be.equal(val);
      expect(languages.indexOf(key)).to.not.be.equal(-1);
    });

    expect(MCO.getMeta('hy').lex.removeLetters(en + ru + hy)).to.be.equal(en + ru);
    expect(MCO.getMeta('en').lex.getLetters()).to.be.equal('A-Za-z');

    expect(MCO.getMeta('absent')).to.be.equal(null);
    expect(MCO.haveMeta('not')).to.be.equal(false);

    var lex = MCO.getMeta('ru').lex;
    expect(lex).to.not.be.equal(null);
    expect(MCO.addMeta.bind(MCO, MCO.getMeta('en'))).to.throw();
    expect(MCO.linkTo.bind(MCO, 'eng', 'absent')).to.throw();
    expect(MCO.linkTo.bind(MCO, 'eng', 'en')).to.not.throw();
  });
});


/*------------------------------------------------------------------------*/


describe('module TableOfContents', function() {
  it('functionality', function() {
    var GEN = 'GEN';
    var EXO = 'EXO';

    var toc = new TableOfContents();
    expect(toc.first()).to.equal(null);

    toc.add(new TocEntry(GEN, undefined, 'name1', 'desc1'));
    expect(toc.length()).to.equal(1);
    expect(toc.have(GEN)).to.equal(true);

    var itm = toc.get(GEN);
    expect(itm.abbr).to.equal('');
    expect(itm.name).to.equal('name1');
    expect(itm.desc).to.equal('desc1');

    expect(toc.add.bind(toc,
           new TocEntry(GEN, undefined, '', ''))).to.throw();
    expect(toc.add(new TocEntry(EXO, '', 'name2', 'desc2')));
    expect(toc.length()).to.equal(2);

    var toc2 = new TableOfContents();

    toc2.add(new TocEntry(GEN, undefined, 'name3', 'desc3'));
    toc2.add(new TocEntry(EXO, undefined, '', ''));

    itm = toc2.get(EXO);
    itm.normalize();

    // after borrow only missing fields should be copied
    toc2.populate(toc, false);

    // nothing should be changed in this entry
    itm = toc2.get(GEN);
    itm.normalize();
    expect(itm.name).to.equal('name3');
    expect(itm.desc).to.equal('desc3');

    // expect to see borrowed values from first table of content
    itm = toc2.get(EXO);
    itm.normalize();

    expect(itm.name).to.equal('name2');
    expect(itm.desc).to.equal('desc2');

    toc.get(GEN).abbr = 'Gen';
    toc.get(EXO).abbr = 'Exo';

    expect(toc.validate.bind(toc)).not.throw();
    expect(toc2.validate.bind(toc2)).to.throw();

    toc2.populate(toc, true);
    expect(toc2.validate.bind(toc2)).not.throw();

    itm = toc.first();
    expect(itm.id).to.equal('GEN');

    itm = toc.next(itm.id);
    expect(itm.id).to.equal('EXO');
    expect(toc.next(itm.id)).to.be.equal(null);

    itm = toc.prev(itm.id);
    expect(itm.id).to.equal('GEN');
    expect(toc.prev(itm.id)).to.be.equal(null);

    itm = toc.prev(itm.id);
    expect(itm).to.equal(null);
    expect(toc.validate.bind(toc)).not.throw();

    var itm1 = toc.get(GEN);
    var itm2 = toc2.get(EXO);

    // invalid tries to populate from item with different id
    expect(itm1.populate.bind(itm1, itm2, false)).to.throw();
    expect(itm1.populate.bind(itm1, itm2, true)).to.throw();

    // invalid construction
    itm = new TocEntry();
    expect(itm.validate.bind(itm)).to.throw('missing id');
    itm.id = GEN;
    expect(itm.validate.bind(itm)).to.throw('missing abbr with id: GEN');
    itm.abbr = 'Gen';
    expect(itm.validate.bind(itm)).to.throw('missing name with id: GEN');
    itm.name = 'Genesis';
    expect(itm.validate.bind(itm)).to.throw('missing desc with id: GEN' );
    itm.normalize();
    expect(itm.validate.bind(itm)).not.throw();

    var arr = [
      {id:'JOS', name:'Joshua', abbr:'Jos',  desc:'The Book of Joshua'},
      {id:'JDG', name:'Judges', abbr:'Jdg',  desc:'The Book of Judges'},
      {id:'RUT', name:'Ruth',   abbr:'Rut',  desc:'The Book of Ruth'  }
    ];
    var tocFromArray = new TableOfContents(arr);
    expect(tocFromArray.length()).to.be.equal(arr.length);
    arr.forEach(function(e) {
      var te = tocFromArray.get(e.id);
      expect(te.name).to.be.equal(e.name);
      expect(te.abbr).to.be.equal(e.abbr);
      expect(te.desc).to.be.equal(e.desc);
    });
  });

  it('performance', function() {
  });
});


/*------------------------------------------------------------------------*/


describe('module TAGs', function() {
  it('supported tags', function() {
    var arrSupported = ['add', '+add*', 'add*', 'nd', '\\qt', '\\+wj'];

    arrSupported.forEach(function(a) {
      expect(TH.isKnown(a)).to.equal(true);
    });

    expect(TH.isTranslator('add')).to.equal(true);
    expect(TH.isJesusWord('wj')).to.equal(true);
    //expect(TH.isAddition('dc')).to.equal(true);
    expect(TH.isOpening('wj*')).to.equal(false);
    expect(TH.isOpening('wj')).to.equal(true);
    expect(TH.isOpening('')).to.equal(false);

    var tag = 'oo';
    expect(TH.discovered()[tag]).to.be.an('undefined');
    for (var i = 1; i <= 2; ++i) {
      TH.onTag(tag);
      expect(TH.discovered()[tag].count).to.be.equal(i);
    }
  });

  it('self contained', function() {
    expect(TH.isSelfContained('v')).to.equal(false);
    expect(TH.isSelfContained('c')).to.equal(false);
    expect(TH.isSelfContained('p')).to.equal(false);
    expect(TH.isSelfContained('q')).to.equal(false);
    expect(TH.isSelfContained('add')).to.equal(true);
  });

  it('ignored tags', function() {
    TH.arrayIgnored().forEach(function(a) {
      expect(TH.isIgnored(a)).to.equal(true);
    });
  });

  it('name of tag', function() {
    expect(TH.name('\\+add*')).to.equal('add');
    expect(TH.name('\\+what*')).to.equal('what');
    expect(TH.name('\\+?what*', 'provided')).to.equal('provided');
  });
});


/*------------------------------------------------------------------------*/


describe('core components', function() {
  it('stack functionality', function() {
    var stack = new Stack();
    expect(stack.empty()).to.be.equal(true);
    expect(stack.size()).to.be.equal(0);
    expect(stack.top()).to.be.equal(null);
    expect(stack.pop()).to.be.equal(null);

    var obj = {val: 1};
    stack.push(obj);
    expect(stack.empty()).to.be.equal(false);
    expect(stack.size()).to.be.equal(1);
    expect(stack.top()).to.be.equal(obj);
    expect(stack.pop()).to.be.equal(obj);
    expect(stack.empty()).to.be.equal(true);
  });

  it('parser robustness', function() {
    var parser = new Parser();
    var str = '\\v 1 \\add xx \\wj \\add* yy \\wj*';
    expect(parser.parse.bind(parser, str)).to.throw(Error, /Expecting to see pair for/);

    str = '\\v \\add xx \\wj \\add* yy \\wj*';
    expect(parser.parse.bind(parser, str)).to.throw(Error, /Expecting to see number/);
    expect(parser.isIgnoredTag('wj')).to.be.equal(false);

    var fn = function(arg) {
      return new Parser(arg);
    };
    expect(fn.bind(fn, {})).to.throw(Error, /Expected array in Parser constructor/);
    expect(fn.bind(fn, '')).to.throw(Error, /Expected array in Parser constructor/);
  });

  describe('bible interface', function() {
    var parser = new Parser();
    var tid1 = 'EXO';
    var tid2 = 'MAT';

    var v1 = parser.parseVerse('\\v 0');
    var v2 = parser.parseVerse('\\v 0');
    var c1 = parser.parseChapter('\\c 0');
    var c2 = parser.parseChapter('\\c 0');
    var b1 = parser.parseBook('\\id ' + tid1 + ' Exodus');
    var b2 = parser.parseBook('\\id ' + tid2 + ' Matthew');
    var bb = new Bible();

    // isolated behavior
    describe('isolated behavior', function() {
      it('verse', function() {
        expect(v1.id()).to.be.equal('null');
        expect(v1.vn()).to.be.equal(0);
        expect(v1.cn()).to.be.equal(0);
        expect(v1.bid()).to.be.equal('');
        expect(v1.next()).to.be.equal(null);
        expect(v1.prev()).to.be.equal(null);
        expect(v1.ref()).to.be.deep.equal(new Reference());
      });

      it('chapter', function() {
        expect(c1.id()).to.be.equal('null');
        expect(c1.bid()).to.be.equal('');
        expect(c1.next()).to.be.equal(null);
        expect(c1.prev()).to.be.equal(null);
        expect(c1.numVerses()).to.be.equal(0);
        expect(c1.ref()).to.be.deep.equal(new Reference());
      });

      it('book', function() {
        //expect(b1.id).to.be.equal('');
        expect(b1.next()).to.be.equal(null);
        expect(b1.prev()).to.be.equal(null);
        expect(b1.numChapters()).to.be.equal(0);
        expect(b1.ref()).to.be.deep.equal(new Reference({ix: 2}));
      });
    });

    // combined behavior
    describe('combined behavior', function() {
      before(function() {
        v1.number = 1;
        c1.number = 1;
        c1.addVerse(v1);
        b1.te.id = tid1;
        b1.addChapter(c1);
        b2.te.id = tid2;
        bb.addBook(b1);
        bb.addBook(b2);
      });

      it('exceptions', function() {
        v2.number = 1;
        expect(c1.addVerse.bind(c1, v2)).to.throw();
        c2.number = 3;
        expect(b1.addChapter.bind(b1, c2)).to.throw();

        v2.number = 2;
        expect(c1.addVerse.bind(c1, v2)).to.not.throw();
        c2.number = 2;
        expect(b1.addChapter.bind(b1, c2)).to.not.throw();
        v2.number = 2;
        expect(c1.addVerse.bind(c1, v2)).to.throw();

        var cx = parser.parseChapter('\\c 0');
        var vx = parser.parseVerse('\\v 1');
        var v4 = parser.parseVerse('\\v 4');
        expect(cx.addVerse.bind(cx, vx)).to.not.throw();
        expect(cx.addVerse.bind(cx, v4)).to.not.throw();

        // verse creator
        var creator = function(node) {
          return new Verse(node);
        };

        var node = new cmn.Node();
        expect(creator.bind(creator, node)).to.throw('Invalid node in Verse constructor');
        node.tag = TAG.V;
        expect(creator.bind(creator, node)).to.throw('Invalid node in Verse constructor');
        expect(creator.bind(creator, null)).to.throw('Undefined or null node object in Verse constructor');
        expect(creator.bind(creator)).to.throw('Undefined or null node object in Verse constructor');

        // switch to chapter creator
        creator = function(node) {
          return new Chapter(node);
        };

        node = new cmn.Node();
        expect(creator.bind(creator, node)).to.throw('Invalid node in Chapter constructor');
        node.tag = TAG.C;
        expect(creator.bind(creator, node)).to.throw('Invalid node in Chapter constructor');
        expect(creator.bind(creator, null)).to.throw('Undefined or null node object in Chapter constructor');
        expect(creator.bind(creator)).to.throw('Undefined or null node object in Chapter constructor');

        // switch to book creator
        creator = function(node) {
          return new Book(node);
        };
        expect(creator.bind(creator, null)).to.throw('Undefined or null node object in Book constructor');
        expect(creator.bind(creator)).to.throw('Undefined or null node object in Book constructor');

        node = new cmn.Node();
        node.tag = 'book';
        expect(creator.bind(creator, node)).to.throw('Invalid node in Book constructor');
      });

      it('verse', function() {
        expect(v1.id()).to.be.equal(tid1 + ' 1:1');
        expect(v2.id()).to.be.equal(tid1 + ' 1:2');
        expect(v1.next()).to.be.equal(v2);
        expect(v2.next()).to.be.equal(null);
        expect(v2.prev()).to.be.equal(v1);
        expect(v1.prev()).to.be.equal(null);
        expect(v1.vn()).to.be.equal(1);
        expect(v1.cn()).to.be.equal(1);
        expect(v1.bid()).to.be.equal(tid1);
      });

      it('chapter', function() {
        expect(c1.id()).to.be.equal(tid1 + ' 1');
        expect(c2.id()).to.be.equal(tid1 + ' 2');
        expect(c2.bid()).to.be.equal(tid1);
        expect(c1.next()).to.be.equal(c2);
        expect(c2.next()).to.be.equal(null);
        expect(c2.prev()).to.be.equal(c1);
        expect(c1.prev()).to.be.equal(null);
        expect(c1.numVerses()).to.be.equal(2);
        expect(c2.numVerses()).to.be.equal(0);
      });

      it('book', function() {
        expect(b1.prev()).to.be.equal(null);
        expect(b1.next()).to.be.equal(b2);
        expect(b2.prev()).to.be.equal(b1);
        expect(b2.next()).to.be.equal(null);
        expect(b1.numChapters()).to.be.equal(2);
        expect(b1.getChapter(c1.number)).to.be.equal(c1);
        expect(b1.getChapter(c2.number)).to.be.equal(c2);
        expect(b2.numChapters()).to.be.equal(0);
      });

      it('bible', function() {
        // @todo:implement
        expect(bb.numBooks()).to.be.equal(2);
        expect(bb.addBook.bind(bb, b1)).to.throw();
        expect(bb.getBook('ABS')).to.be.equal(null);
      });

      it('references', function() {
        var tid = 'REV';
        var numChaps = 3;
        var numVerses = 11;
        var book = tc.createBook(tid, numChaps, numVerses);

        for (var i = 1; i < numChaps; ++i) {
          for (var j = 1; j < numVerses; ++j) {
            var chap = book.getChapter(i);
            var verse = chap.getVerse(j);

            var rb = book.ref();
            expect(rb.ix).to.be.equal(book.index);
            expect(rb.cn).to.be.equal(0);
            expect(rb.vn).to.be.equal(0);

            var rc = chap.ref();
            expect(rc.ix).to.be.equal(book.index);
            expect(rc.cn).to.be.equal(chap.number);
            expect(rc.vn).to.be.equal(0);

            var vc = verse.ref();
            expect(vc.ix).to.be.equal(book.index);
            expect(vc.cn).to.be.equal(chap.number);
            expect(vc.vn).to.be.equal(verse.vn());

            var ref = verse.ref();
            var encRef = ref.encode();

            // references have 8 bytes length
            expect(encRef.length).to.be.equal(8);
            var decRef = (new lb.Reference()).decode(encRef);
            expect(ref).to.deep.equal(decRef);
          }
        }
      });
    });
  });

  // usfm format parsing
  describe('usfm format', function() {
    var parser    = new Parser(TH.arrayIgnored());
    var parserAll = new Parser();
    var usfmRndr  = new UsfmRenderer();
    var textRndr  = new TextRenderer({ textOnly: false });

    // file name info
    it('file name info', function() {
      var info = decodeFileName('02-OnEru-synod.usfm');
      expect(info.on).to.be.equal(2);
      expect(info.id).to.be.equal('ONE');
      expect(info.lang).to.be.equal('ru');
      expect(info.bibleAbbr).to.be.equal('SYNOD');

      info = decodeFileName('132-OnE.usfm');
      expect(info).to.be.a('null');

      info = decodeFileName('132-OnE.usfm', false);
      expect(info.on).to.be.equal(132);
      expect(info.id).to.be.equal('ONE');
      expect(info.lang).to.be.an('undefined');
      expect(info.bibleAbbr).to.be.an('undefined');
    });

    // node count monitoring
    it('node count monitoring', function() {
      var verse = null;
      verse = parserAll.parseVerse('\\v 1');
      expect(verse.node.count()).to.be.equal(1);

      verse = parserAll.parseVerse('\\v 2 \\add \\add*');
      expect(verse.node.count()).to.be.equal(2);

      verse = parserAll.parseVerse('\\v 3 \\add text \\add*');
      expect(verse.node.count()).to.be.equal(3);

      verse = parserAll.parseVerse('\\v 4 \\add this \\+add is \\+add*a\\add*sample.');
      expect(verse.node.count()).to.be.equal(7);

      var complex = '\\v 5 \\add  \\add*B';
      verse = parserAll.parseVerse(complex);
      expect(verse.node.count()).to.be.equal(3);
    });

    describe('parse verses and', function() {
      it('save as usfm', function() {
        dusfm.verses.forEach(function(o) {
          var ref      = o.data;
          var orig     = ref.orig.replace(/\n/g, ' ').replace(/\s+/g, ' ');

          var verse    = parser.parseVerse(ref.orig);
          var restored = verse.render(usfmRndr);
          expect(restored).to.equal(ref.parsed);

          verse        = parserAll.parseVerse(ref.orig);
          restored     = verse.render(usfmRndr);
          expect(restored).to.equal(orig);
        });
      });

      it('save as text', function() {
        dusfm.verses.forEach(function(o) {
          var ref      = o.data;
          var orig     = ref.orig.replace(/\n/g, ' ').trim();
          var verse    = parser.parseVerse(orig);
          var restored = verse.render(textRndr);
          expect(ref.text).to.equal(restored);
        });
      });
    });
  });

  describe('parse book', function() {
    var parser = new Parser();
    var tmp = dusfm.bookTemplate;

    it('with invalid input', function() {
      var str = tmp.replace('{{ID}}', 'id ');
      expect(parser.parseBook.bind(parser, str)).to.throw('Failed to identify book id');

      str = tmp.replace('{{ID}}', 'id GEN');
      str = str.replace('{{ENCODING}}', 'ide UTF-7');
      expect(parser.parseBook.bind(parser, str)).to.throw();

      str = tmp.replace('{{ID}}', 'id KKK');
      expect(parser.parseBook.bind(parser, str)).to.throw('Invalid book id: KKK');
      expect(parser.parseBook.bind(parser, {obj:1})).to.throw('parseBook expects a string argument');

      str = tmp.replace('{{ID}}', 'id GEN');
      str = str.replace('{{ENCODING}}', 'ide UTF-8');
      var book = parser.parseBook(str);
      expect(book.numChapters()).to.be.equal(3);

      var usfmRndr = new UsfmRenderer();
      var rendered = book.getChapter(1).render(usfmRndr);
      rendered = rendered.replace(/\r/g, '');
      expect(str.indexOf(rendered)).to.not.equal(-1);
    });
  });

  // rendering
  describe('rendering', function() {
    var bible          = null;
    var textAndIdsRndr = new TextRenderer({textOnly: false});
    var textRndr       = new TextRenderer();
    var usfmRndr       = new UsfmRenderer(['tag1', 'tag2']);
    var indentUsfmRndr = new IndentedUsfmRenderer();
    var prettyRndr     = new PrettyRenderer();
    var htmlRndr       = new HtmlRenderer();

    it('locating book', function() {
      var filesDir = path.join(__dirname, 'usfm/');
      expect(findBook(filesDir, 'NON')).is.equal(null);
      expect(findBook(filesDir, 'MAT')).is.not.equal(null);
    });

    it('reading from hdd', function() {
      var filesDir = path.join(__dirname, 'usfm/');
      bible = loadBible(filesDir, {
        tocOverwrite: false
      });

      expect(function() {
        loadBook('invalid fname');
      }).to.throw();

      var book = loadBook(path.join(filesDir, '70-MATeng-kjv.usfm'));
      expect(book.ref()).to.be.deep.equal(new Reference({ix: BBM.instance().onById('MAT')}));
    });

    // save data to hdd
    it('saving to hdd', function() {
      var filesDir = path.join(__dirname, 'usfm/');
      var tempDir = path.join(__dirname, 'to_delete/');
      var newBBM = lb.guessBBM(filesDir);
      BBM.activate(newBBM);
      saveBible(tempDir, bible);

      // activate default BBM instance
      BBM.activate();

      // read the bible that we have saved just now
      var bible1 = loadBible(tempDir, {
        tocOverwrite: false
      });
      fs.removeSync(tempDir);
      expect(bible).to.be.deep.equal(bible1);
    });

    it('usfm', function() {
      var str = bible.render(usfmRndr);
      expect(str.length).to.be.equal(17948);
    });

    it('text', function() {
      var str = bible.render(textAndIdsRndr);
      expect(str.length).to.be.equal(7218);
      str = bible.render(textRndr);
      expect(str.length).to.be.equal(7025);
    });

    it('indented usfm', function() {
      var str = bible.render(indentUsfmRndr);
      expect(str.length).to.be.equal(36073);
    });

    it('pretty', function() {
      var str = bible.render(prettyRndr);
      expect(str.length).to.be.equal(7525);
    });

    it('html', function() {
      var str = bible.render(htmlRndr);
      expect(str.length).to.be.equal(19873);
    });

    var samples = 50;
    it('usfm performance', function() {
      for (var i = 0; i < samples; ++i)
        bible.render(usfmRndr);
    });

    it('text performance', function() {
      for (var i = 0; i < samples; ++i)
        bible.render(textRndr);
    });

    it('complain for incomplete renderer', function() {
      // creating custom rendere
      var CustomRenderer = function() {
        Renderer.call(this);
      };
      inherit(CustomRenderer, Renderer);
      var customRndr = new CustomRenderer();

      var listOfMethodsToImplement = [
        'defineTagView',
        'getTextView',
        'getNumberView',
        'defineComplexView'
      ];

      listOfMethodsToImplement.forEach(function(methodName) {
        expect(bible.render.bind(bible, customRndr)).to.throw();

        // add function per iteration to our renderer
        customRndr[methodName] = function() { return ''; };
      });

      // but now our renderer is properly formed, have all required methods
      bible.render(customRndr);
    });

  });
});


/*------------------------------------------------------------------------*/

describe('common functionality', function() {
  it('node', function() {
    var node = NH.createText('hello');
    expect(node.addChild.bind(node, null)).to.throw(Error, /Only tag node can have child nodes/);

    var world = NH.createText('world');
    node.setNext(world);
    expect(node.getNext()).to.equal(world);

    var beautiful = NH.createText('world');
    node.setNext(beautiful);
    expect(node.getNext()).to.equal(beautiful);
    expect(beautiful.getNext()).to.equal(world);

    expect(node.enum.bind(node, true)).to.throw(Error, /Unable to enumerate non-tag node/);
    expect(node.find.bind(node, [])).to.throw(Error, /Unable to search in a non-tag node/);

    var root = NH.createTag('add');
    expect(root.find.bind(root, true, [])).to.throw(Error, /Expecting string type for tag/);

    root.addChild(NH.createTag('add'));
    root.firstChild().addChild(NH.createTag('add'));
    var res = [];
    root.enum(true, function(n) { res += n.tag; });
    expect(res).to.equal('addadd');

    res = [];
    root.find('add', res);
    expect(res.length).to.deep.equal(2);
  });
});


/*------------------------------------------------------------------------*/

describe('search functionality', function() {
  it('dictionary', function() {
    var dict = new Dictionary();

    var text = {
      'no no no': '05',
      'a an apple an apricot an ariplane': '01',
      'apple is a fruit': '02',
      'ok': '03',
      'yes no': '04',
      'aaa': '06',
      'apple': '07'
    };

    _.each(text, function(value, key) {
      key.split(' ').forEach(function(e) {
        dict.add(e, value);
      });
    });

    expect(dict.words.bind(dict)).to.throw();
    expect(dict.count()).to.be.equal(11);

    // empty words should be added
    dict.add('', '10');
    expect(dict.count()).to.be.equal(11);

    // verification should fail before optimize
    expect(dict.verify.bind(dict)).to.throw();

    dict.optimize();
    expect(dict.count()).to.be.equal(11);
    expect(dict.occurrence('missing')).to.be.equal(0);
    expect(dict.occurrence()).to.be.equal(0);

    // optimize call on optimized array has no efffect
    dict.optimize();

    // each word should be found in the dictionary
    Object.keys(dict.words()).forEach(function(word) {
      expect(dict.find(word).length).is.not.equal(0);
    });

    // should fail to find
    expect(dict.find('not exists')).to.deep.equal([]);
    expect(dict.stat()).to.have.all.keys(
      'unique',
      'total',
      'freq',
      'index',
      'str'
      );

    // should succeed to find
    var ref = dict.find('a');
    expect(ref.indexOf('01')).is.not.equal(-1);
    expect(ref.indexOf('02')).is.not.equal(-1);
    expect(ref.indexOf('07')).is.equal(-1);

    expect(dict.verify.bind(dict)).not.throw();
    expect(dict.clear.bind(dict)).not.throw();
  });

  describe('algorithms', function() {
    var cases = [
      {a: [1, 2, 4, 6, 7, 8, 99], b: [3, 4, 5, 6, 7, 20, 24, 27]},
      {a: [],  b: []},
      {a: [1], b: []},
      {a: [],  b: [2]},
      {a: [1], b: [1]},
      {a: [2, 3], b: [1, 2, 3]},
      {a: [5, 7], b: [4]},
      {a: [1, 2], b: []},
      {a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 17, 19, 20, 22, 25, 27, 30], b: [-1, 1, 2, 3, 4, 5, 6, 10, 30, 31, 99, 102]}
    ];

    function sortNumber(a, b) {
      return a - b;
    }

    it('intersection', function() {
      cases.forEach(function(elem) {
        var x  = search.algo.intersect2Array(elem.a, elem.b);
        var x1 = search.algo.intersect2Array(elem.b, elem.a);
        var y  = _.intersection(elem.a, elem.b);
        expect(x).to.deep.equal(y);
        expect(x1).to.deep.equal(y);
      });
    });

    it('union', function() {
      cases.forEach(function(elem) {
        var x = search.algo.union2Array(elem.a, elem.b);
        var x1 = search.algo.union2Array(elem.b, elem.a);
        var y = _.union(elem.a, elem.b);
        y.sort(sortNumber);
        expect(x).to.deep.equal(y);
        expect(x1).to.deep.equal(y);
      });
    });
  });

  describe('search', function() {
    var srch = new Search();
    var words = [
      {w: 'EARTH', r: '1'},
      {w: 'temp',  r: '2'},
      {w: 'Other', r: '3'}
    ];
    var opts, res, xref, axref, i;
    var orig, tcase, lcase, ucase;

    // add some words into dictionary
    before(function(){
      words.forEach(function(w) {
        srch.add(w.w, w.r);
      });
    });

    function prepareResults(item) {
      orig  = item.w;
      xref  = item.r;
      axref = [xref];
      tcase = toTitleCase(orig);
      lcase = orig.toLowerCase();
      ucase = orig.toUpperCase();
    }

    it('remind to build index', function() {
      // expect to throw
      expect(srch.query.bind(srch, 'dont mind')).to.throw();
      srch.build();
      srch.query('dont mind 2');
      expect(Object.keys(srch.getDictionary().words())).deep.equal(['EARTH','temp', 'Other']);
    });

    it('case sensitive && whole word', function() {
      // search with case sensitive and whole word options
      opts = {cs: true,  ww: true};

      words.forEach(function(item) {
        prepareResults(item);

        res = srch.query(orig, opts);
        expect(res).to.deep.equal(axref);
        for (i = 3; i < orig.length; ++i) {
          res = srch.query(orig.substr(0, i), opts);
          expect(res).to.deep.equal([]);
        }
        if (lcase !== orig)
          expect(srch.query(lcase, opts)).to.deep.equal([]);
        else
          expect(srch.query(lcase, opts)).to.deep.equal(axref);
        if (tcase !== orig)
          expect(srch.query(tcase, opts)).to.deep.equal([]);
        else
          expect(srch.query(tcase, opts)).to.deep.equal(axref);
        if (ucase !== orig)
          expect(srch.query(ucase, opts)).to.deep.equal([]);
        else
          expect(srch.query(ucase, opts)).to.deep.equal(axref);
      });
    });

    it('case sensitive', function() {
      // search with case sensitive options only
      opts = {cs: true,  ww: false};

      words.forEach(function(item) {
        prepareResults(item);

        res = srch.query(orig, opts);
        expect(res).to.deep.equal(axref);
        for (i = 3; i < orig.length; ++i) {
          res = srch.query(orig.substr(0, i), opts);
          expect(res).to.deep.equal(axref);
        }
        if (lcase !== orig)
          expect(srch.query(lcase, opts)).to.deep.equal([]);
        else
          expect(srch.query(lcase, opts)).to.deep.equal(axref);
        if (tcase !== orig)
          expect(srch.query(tcase, opts)).to.deep.equal([]);
        else
          expect(srch.query(tcase, opts)).to.deep.equal(axref);
        if (ucase !== orig)
          expect(srch.query(ucase, opts)).to.deep.equal([]);
        else
          expect(srch.query(ucase, opts)).to.deep.equal(axref);
      });
    });

    it('whole word', function() {
      // search with whole word option only
      opts = {cs: false,  ww: true};

      words.forEach(function(item) {
        prepareResults(item);

        res = srch.query(orig, opts);
        expect(res).to.deep.equal(axref);
        for (i = 3; i < orig.length; ++i) {
          res = srch.query(orig.substr(0, i), opts);
          expect(res).to.deep.equal([]);
        }
        expect(srch.query(lcase, opts)).to.deep.equal(axref);
        expect(srch.query(tcase, opts)).to.deep.equal(axref);
        expect(srch.query(ucase, opts)).to.deep.equal(axref);
      });
    });

    it('options turned off', function() {
      // search with whole word option only
      opts = {cs: false,  ww: false};

      words.forEach(function(item) {
        prepareResults(item);

        res = srch.query(orig, opts);
        expect(res).to.deep.equal(axref);
        for (i = 3; i < orig.length; ++i) {
          res = srch.query(orig.substr(0, i), opts);
          expect(res).to.deep.equal(axref);
        }

        orig = orig.toLowerCase();
        for (i = 3; i < orig.length; ++i) {
          res = srch.query(orig.substr(0, i), opts);
          expect(res).to.deep.equal(axref);
        }

        expect(srch.query(lcase, opts)).to.deep.equal(axref);
        expect(srch.query(tcase, opts)).to.deep.equal(axref);
        expect(srch.query(ucase, opts)).to.deep.equal(axref);
      });
    });
  });

  describe('advanced search', function() {
    var srch = new Search();
    var text = [
      {s: 'In the beginning God created the heaven and the earth', r: '1'},
      {s: 'And the serpent said unto the woman Ye shall not surely die', r: '2'},
      {s: 'And to rule over the day and over the night', r: '3'},
      {s: 'And the evening and the morning were the third day', r: '4'},
      {s: 'thee anda Intro Evenin', r: '5'},
      {s: 'into', r: '6'},
      {s: 'Even', r: '7'},
      {s: '', r: '8'}
    ];

    var opts;

    // add some words into dictionary
    before(function() {
      text.forEach(function(ti) {
        ti.s.split(' ').forEach(function(w) {
          srch.add(w, ti.r);
        });
      });
      srch.build();
    });

    it('cs && ww', function() {
      opts = {cs: true,  ww: true};
      expect(srch.query('and', opts)).to.deep.equal(['1', '3', '4']);
      expect(srch.query('third', opts)).to.deep.equal(['4']);
      expect(srch.query('And', opts)).to.deep.equal(['2', '3', '4']);
      expect(srch.query('the', opts)).to.deep.equal(['1', '2', '3', '4']);
      expect(srch.query('The', opts)).to.deep.equal([]);
    });

    it('cs', function() {
      opts = {cs: true,  ww: false};
      expect(srch.query('And', opts)).to.deep.equal(['2', '3', '4']);
      expect(srch.query('and', opts)).to.deep.equal(['1', '3', '4', '5']);
      expect(srch.query('third', opts)).to.deep.equal(['4']);
      expect(srch.query('the', opts)).to.deep.equal(['1', '2', '3', '4', '5']);
      expect(srch.query('int', opts)).to.deep.equal(['6']);
      expect(srch.query('Int', opts)).to.deep.equal(['5']);
    });

    it('ww', function() {
      opts = {cs: false,  ww: true};
      expect(srch.query('and', opts)).to.deep.equal(['1', '2', '3', '4']);
      expect(srch.query('And', opts)).to.deep.equal(['1', '2', '3', '4']);
    });

    it('options turned off', function() {
      opts = {cs: false,  ww: false};
      expect(srch.query('int', opts)).to.deep.equal(['5', '6']);
      expect(srch.query('eve', opts)).to.deep.equal(['4', '5', '7']);
      expect(srch.query('the', opts)).to.deep.equal(['1', '2', '3', '4', '5']);
    });

    it('invalid args', function() {
      opts = {cs: 'false',  ww: 'false'};
      expect(srch.query('int', opts)).to.deep.equal([]);
      expect(srch.query.bind(srch, {}, opts)).to.throw();
      expect(srch.query.bind(srch, 'int', 'aaaa')).to.throw();
    });
  });
});


/*------------------------------------------------------------------------*/


describe('module BibleSearch', function() {
  var text = [
    {s: '\\v 1 And Isaac loved Esau, because he did eat of [his] venison: but Rebekah loved Jacob.'},
    {s: '\\v 2 And he went, and fetched, and brought [them] to his mother: and his mother made savoury meat, such as his father loved.'},
    {s: '\\v 3 And Jacob loved Rachel; and said, I will serve thee seven years for Rachel thy younger daughter.'},
    {s: '\\v 4 And he went in also unto Rachel, and he loved also Rachel more than Leah, and served with him yet seven other years.'}
  ];

  var bs    = null;
  var opts  = {cs: true, ww: true}; // for correct usage provide boolean values

  // add words into dictionary
  before(function() {
    var parser = new Parser();
    var bible  = new Bible();
    var book   = parser.parseBook('\\id GEN Genesis');
    var chap   = parser.parseChapter('\\c 1');
    var chap2  = parser.parseChapter('\\c 2');

    book.index = BBM.instance().onById(book.te.id);
    bible.addBook(book.addChapter(chap));
    book.addChapter(chap2);

    text.forEach(function(ti) {
      var v = parser.parseVerse(ti.s);
      chap.addVerse(v);
      ti.r = v.ref().encode();
    });

    var bsCreator = function() {
      return new BibleSearch(bible);
    };

    bible.lang = 'absent';
    expect(bsCreator.bind(bsCreator)).to.throw();

    bible.lang = 'en';
    bs = new BibleSearch(bible);

    expect(bs.bible()).to.be.equal(bible);

    var stats = bs.search().getStatistics();
    expect(stats.cs.unique).to.be.equal(50);
    expect(stats.cs.total).to.be.equal(77);
    expect(stats.ci.unique).to.be.equal(49);
    expect(stats.ci.total).to.be.equal(77);
  });

  it('word searching', function() {
    expect(bs.query('Because').refs).to.deep.equal([]);
    expect(bs.query('Because', opts).refs).to.deep.equal([]);
    expect(bs.query('because', opts).refs).to.deep.equal([text[0].r]);

    opts.cs = false;
    expect(bs.query('because', opts).refs).to.deep.equal([text[0].r]);
  });

  it('text searching', function() {
    opts.cs = false;
    expect(bs.query('Rachel', opts).refs).to.deep.equal([text[2].r, text[3].r]);
    expect(bs.query('Rachel serve', opts).refs).to.deep.equal([text[2].r]);

    expect(bs.query('serve mother', opts).refs).to.deep.equal([]);
    expect(bs.query('serve mother absent again', opts).refs).to.deep.equal([]);
    expect(bs.query('and loved his but', opts).refs).to.deep.equal([text[0].r]);

    opts.op = 'or';
    expect(bs.query('serve mother', opts).refs).to.deep.equal([text[1].r, text[2].r]);
    expect(bs.query('serve mother absent', opts).refs).to.deep.equal([text[1].r, text[2].r]);
    expect(bs.query('serve mother absent again', opts).refs).to.deep.equal([text[1].r, text[2].r]);

    opts.ww = false;
    expect(bs.query('and loved his but', opts).refs).to.deep.equal([text[0].r, text[1].r, text[2].r, text[3].r]);
    expect(bs.query('doesnotexists', opts).refs).to.deep.equal([]);
    expect(bs.query('k', opts).refs).to.deep.equal([]);
  });

  it('navigation', function() {
    var rndr = new UsfmRenderer();

    expect(bs.nav('XYZ')).to.be.equal(null);
    expect(bs.nav('GEN 1:3').render(rndr)).to.deep.equal(text[2].s);
    expect(bs.nav('GEN 100:4')).to.equal(null);
    expect(bs.nav('GEN 2')).to.equal(null);
    expect(bs.nav('GEN 1').render(rndr)).to.deep.equal(text[0].s);
    expect(bs.nav('GEN').render(rndr)).to.deep.equal(text[0].s);
    expect(bs.nav(':')).to.equal(null);
  });
});


/*------------------------------------------------------------------------*/


describe('new test scenario', function() {
  it('simple case', function() {
    // @todo:implement
  });
});

