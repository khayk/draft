var _              = require('underscore');
var expect         = require('chai').expect;
var bibleModule    = require('../lib/bible.js');
var funcs          = require('../lib/functionality.js');
var utils          = require('../utils/utils.js');
var core           = require('../core.js');
var dataUSFM       = require('./dataUSFM.js');
var fs             = require('fs');

var BBM            = bibleModule.BBM;
var Tags           = bibleModule.Tags;
var USFMParser     = bibleModule.USFMParser;
var USFMRenderer   = bibleModule.USFMRenderer;
var TextRenderer   = bibleModule.TextRenderer;
var TableOfContent = bibleModule.TableOfContent;
var TocItem        = bibleModule.TocItem;

var Verse          = bibleModule.Verse;
var Chapter        = bibleModule.Chapter;
var Book           = bibleModule.Book;
var Bible          = bibleModule.Bible;


// exported functions from bible module
var encodeRef      = bibleModule.encodeRef;
var decodeRef      = bibleModule.decodeRef;

// utils exports
var createTestBook = utils.createTestBook;

// lexical collections
var LexicalCollection = funcs.LexicalCollection;
var Lexical           = funcs.Lexical;
var Dictionary        = funcs.Dictionary;


describe('module BBM', function() {
  var o = BBM.instance();
  var initialCount = o.numEntries();

  it('interface', function() {
    expect(BBM.instance()).to.have.all.keys(
      'entries',
      'entryById',
      'entryByOn',
      'existsId',
      'idByOn',
      'ids',
      'nextId',
      'numEntries',
      'onById',
      'ons',
      'prevId');
  });

  it('content', function() {
    expect(initialCount).to.be.at.least(75);
    var gen = o.entryById('GEN');
    expect(gen).to.have.all.keys('id', 'index', 'abbr', 'type');
    expect(gen.abbr).to.equal('Ge');
    expect(gen.index).to.equal(1);
    expect(gen.type).to.equal(1);
    expect(o.entryByOn(gen.index)).to.equal(gen);
    expect(o.existsId('REV')).to.equal(true);
    expect(o.existsId('1TH')).to.equal(true);
    expect(o.onById('REV')).to.equal(75);
    expect(o.idByOn(75)).to.equal('REV');


    expect(o.numEntries()).to.equal(initialCount);

    var indices = [];
    _.each(o.ons(), function(val, key) {
      indices.push(val);
    });

    // expect to meet elements in an ascending order by member index
    var prev = null;
    indices.forEach(function(ind) {
      if (prev !== null) {
        var bbme = o.entries()[ind];
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
    expect(count).to.equal(75);

    // move backward
    id = 'REV';
    while (id !== null) {
      id = BBM.instance().prevId(id);
      --count;
    }
    expect(count).to.equal(0);
  });

  it('immutability', function() {
    // the number of entries should not be altered if queries missing entry
    expect(o.entryById('NOT FOUND')).to.equal(null);
    expect(o.existsId('NONE')).to.equal(false);
    expect(o.onById('NONE')).to.equal(0);
    expect(o.idByOn(111)).to.equal(null);
    expect(o.numEntries()).to.equal(initialCount);
  });

  it('performance', function() {
    var id, count;
    for (var i = 0; i < 1000; ++i) {
      id = 'GEN';
      while (id !== null) {
        id = BBM.instance().nextId(id);
      }
    }
  });

});

describe('module Lexical', function() {

  var en = '';
  var ru = '';
  var hy = '';
  var puncts = '`!@?\'\",-_«»';

  // initialize language letters
  before(function() {
    function insert(str, index, value) {
      return str.substr(0, index) + value + str.substr(index);
    }

    var enAlphabet, firstLower, firstUpper, i, lo, hi;

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
    LexicalCollection.init(__dirname + '/../data/lexical.json');
    var languages = LexicalCollection.getLanguages();

    var obj = {'ru': ru, 'en': en, 'hy': hy};

    _.each(obj, function(val, key) {
      var lex = LexicalCollection.getLexical(key);
      var res = lex.removePunctuations(en + ru + hy);
      expect(res).to.be.equal(val);
      expect(languages.indexOf(key)).to.not.be.equal(-1);
    });

    expect(LexicalCollection.getLexical('absent')).to.be.equal(null);
    expect(LexicalCollection.haveLanguage('not')).to.be.equal(false);

    var lex = LexicalCollection.getLexical(obj.ru);
    expect(LexicalCollection.addLexical.bind(LexicalCollection, lex)).to.throw();
  });
});

describe('module TableOfContent', function() {

  it('functionality', function() {
    var toc = new TableOfContent();
    expect(toc.firstItem()).to.equal(null);
    toc.addItem(new TocItem('GEN', undefined, 'name1', 'lname1', 'desc1'));
    expect(toc.numItems()).to.equal(1);
    expect(toc.haveItem('GEN')).to.equal(true);

    var itm = toc.getItem('GEN');
    expect(itm.abbr).to.equal('Ge');
    expect(itm.name).to.equal('name1');
    expect(itm.lname).to.equal('lname1');
    expect(itm.desc).to.equal('desc1');

    expect(toc.addItem.bind(toc,
           new TocItem('GEN', undefined, '', '', ''))).to.throw();
    expect(toc.addItem(new TocItem('EXO', '', 'name2', 'lname2', 'desc2')));
    expect(toc.numItems()).to.equal(2);

    var toc2 = new TableOfContent();
    toc2.addItem(new TocItem('GEN', undefined, 'name3', 'lname3', 'desc3'));
    toc2.addItem(new TocItem('EXO', undefined, '', '', ''));

    // after borrow only missing fields should be copied
    toc2.borrow(toc);

    // nothing should be changed in this item
    itm = toc2.getItem('GEN');
    expect(itm.name).to.equal('name3');
    expect(itm.lname).to.equal('lname3');
    expect(itm.desc).to.equal('desc3');

    // expect to see borrowed values from first table of content
    itm = toc2.getItem('EXO');
    expect(itm.name).to.equal('name2');
    expect(itm.lname).to.equal('lname2');
    expect(itm.desc).to.equal('desc2');

    expect(toc.verify.bind()).not.throw();
    expect(toc2.verify.bind()).not.throw();

    itm = toc.firstItem();
    expect(itm.id).to.equal('GEN');

    itm = toc.nextItem(itm.id);
    expect(itm.id).to.equal('EXO');

    itm = toc.prevItem(itm.id);
    expect(itm.id).to.equal('GEN');

    itm = toc.prevItem(itm.id);
    expect(itm).to.equal(null);
    toc.verify();
  });

  it('performance', function() {
    var toc = new TableOfContent();
    BBM.instance().entries().forEach(function(e) {
      toc.addItem(new TocItem(e.id, e.abbr, 'a', 'b', 'c'));
    });

    expect(toc.numItems()).to.equal(BBM.instance().numEntries());
    for (var i = 0; i < 1000; ++i) {
      var it = toc.firstItem();
      while (it)
        it = toc.nextItem(it.id);
    }
  });
});


describe('module TAGs', function() {
  it('supported tags', function() {
    var arrSupported = ['add', '+add*', 'add*', 'nd', '\\qt', '\\+wj'];

    arrSupported.forEach(function(a) {
      expect(Tags.isSupported(a)).to.equal(true);
    });

    expect(Tags.isTranslator('add')).to.equal(true);
    expect(Tags.isJesusWord('wj')).to.equal(true);
    expect(Tags.isOpening('wj*')).to.equal(false);
    expect(Tags.isOpening('wj')).to.equal(true);
  });

  it('unsupported tags', function() {
    var arrUnsupported = ['\\www', '\\+a'];
    arrUnsupported.forEach(function(a) {
      expect(Tags.isSupported(a)).to.equal(false);
    });
  });

  it('name of tag', function() {
    expect(Tags.name('\\+add*')).to.equal('add');
    expect(Tags.name('\\+what*')).to.equal('unknown');
    expect(Tags.name('\\+what*', 'provided')).to.equal('provided');
  });
});


describe('core modules', function() {
  var bible = null;
  var pack = null;

  var stub = function(cb) {
    var completionCb = cb;
    return {
      onScanned: function(err, packages) {
        expect(core.PackManager.getAll()).be.equal(packages);

        var lid = 'en';
        var abbr = 'tkjv';
        pack = core.PackManager.getPackage(lid, abbr);

        expect(pack).to.not.equal(null);
        bible = core.Loader.loadBible(pack);

        // start verification
        expect(bible.abbr).to.equal(pack.ctx.abbr);
        expect(bible.name).to.equal(pack.ctx.name);
        expect(bible.desc).to.equal(pack.ctx.desc);
        expect(bible.year).to.equal(pack.ctx.year);
        expect(bible.lang).to.equal(pack.ctx.lang);
        //expect(bible.toc).to.be.an.instanceof(bibleModule.TableOfContent);

        expect(bible.toc.numItems()).to.equal(bible.books.length);

        completionCb();
      }
    };
  };

  describe('read usfm format', function() {
    var parser = new USFMParser(true);
    var parserAll = new USFMParser(false);
    var usfmRndr = new USFMRenderer();
    var textRndr = new TextRenderer();

    it('write as usfm', function() {
      dataUSFM.verses.forEach(function(o) {
        var ref      = o.data;
        var orig     = ref.orig.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        var verse    = parser.parseVerse(ref.orig);
        var verseAll = parserAll.parseVerse(ref.orig);

        var restored = verse.render(usfmRndr);
        var restoredAll = verseAll.render(usfmRndr);

        expect('\\v 0 ' + ref.parsed).to.equal(restored);
        expect('\\v 0 ' + orig).to.equal(restoredAll);
      });
    });

    it('write as text', function() {
      dataUSFM.verses.forEach(function(o) {
        var ref = o.data;
        var orig = ref.orig.replace(/\n/g, ' ').trim();
        var verse = parser.parseVerse(orig);
        var restored = verse.render(textRndr);
        expect(ref.text).to.equal(restored);
      });
    });

    it('loading test data from disc', function(done) {
      core.PackManager.scan('./data/test/', true, stub(done).onScanned);
    });
  });

  describe('bible interface', function() {
    var bb = new Bible();
    var b1 = new Book();
    var b2 = new Book();
    var c1 = new Chapter();
    var c2 = new Chapter();
    var v1 = new Verse();
    var v2 = new Verse();

    describe('isolated behavior', function() {
      it('book', function() {
        expect(b1.id).to.be.equal('');
        expect(b1.next()).to.be.equal(null);
        expect(b1.prev()).to.be.equal(null);
        expect(b1.numChapters()).to.be.equal(0);
      });

      it('chapter', function() {
        expect(c1.id()).to.be.equal('null 0');
        expect(c1.bid()).to.be.equal('');
        expect(c1.next()).to.be.equal(null);
        expect(c1.prev()).to.be.equal(null);
        expect(c1.numVerses()).to.be.equal(0);
      });

      it('verse', function() {
        expect(v1.id()).to.be.equal('null 0: 0');
        expect(v1.vn()).to.be.equal(0);
        expect(v1.cn()).to.be.equal(0);
        expect(v1.bid()).to.be.equal('');
        expect(v1.next()).to.be.equal(null);
        expect(v1.prev()).to.be.equal(null);
      });
    });

    describe('combined behavior', function() {
      var tid1 = 'MAT';
      var tid2 = 'MRK';

      before(function() {
        v1.number = 1;
        c1.number = 1;
        c1.addVerse(v1);
        b1.id = tid1;
        b1.addChapter(c1);
        b2.id = tid2;
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

      it('references', function() {
        var tid = 'REV';
        var numChaps = 3;
        var numVerses = 7;
        var book = createTestBook(tid, numChaps, numVerses);

        for (var i = 1; i < numChaps; ++i) {
          for (var j = 1; j < numVerses; ++j) {
            var chap  = book.getChapter(i);
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
            var encRef  = encodeRef(ref);

            // references have 8 bytes length
            expect(encRef.length).to.be.equal(8);

            var decRef = decodeRef(encRef);
            expect(ref).to.deep.equal(decRef);
          }
        }
      });

      it('dictionary', function() {
        var dict = new Dictionary();

        var text = {
          'a an apple an apricot an ariplane': '01',
          'apple is a fruit': '02',
          'ok': '03',
          'yes no': '04',
          'no no no': '05',
          'aaa': '06',
          'apple': '07'
        };

        _.each(text, function(value, key) {
          key.split(' ').forEach(function(e) {
            dict.add(e, value);
          });
        });
        dict.optimize();
        expect(dict.count()).to.be.equal(11);

        // each word should be found in the dictionary
        dict.words().forEach(function(word) {
          expect(dict.find(word)).is.not.equal(null);
        });

        // should fail to find
        expect(dict.find('not exists')).is.equal(null);

        // should succeed to find
        var ref = dict.find('a');
        expect(ref.indexOf('01')).is.not.equal(-1);
        expect(ref.indexOf('02')).is.not.equal(-1);
        expect(ref.indexOf('07')).is.equal(-1);
      });

      it('bible', function() {
        bb.sort();
      });
    });

    describe('rendering', function() {
      function compareContentOrCreate(file, str) {
        var data = '';
        try {
          data = fs.readFileSync(file, 'utf8');
        } catch (e) {}

        if (data === '')
          fs.writeFile(file, str);
        else
          expect(str).to.equal(data);
      }

      describe('bible', function() {
        it('usfm', function() {
          var usfmRndr = new USFMRenderer();
          var str = bible.render(usfmRndr);
          var file = pack.dir + '/usfm.render';
          compareContentOrCreate(file, str);
        });

        it('text', function() {
          var textRndr = new TextRenderer();
          var str = bible.render(textRndr);
          var file = pack.dir + '/text.render';
          compareContentOrCreate(file, str);
        });

        var samples = 500;
        it('usfm performance', function() {
          var usfmRndr = new USFMRenderer();
          var str = null;
          for (var i = 0; i < samples; ++i)
            bible.render(usfmRndr);
        });

        it('text performance', function() {
          var textRndr = new TextRenderer();
          var str = null;
          for (var i = 0; i < samples; ++i)
            bible.render(textRndr);
        });

      });
    });
  });
});
