var _              = require('underscore');
var expect         = require('chai').expect;
var bibleModule    = require('../lib/bible.js');
var helper         = require('../lib/helper.js');
var core           = require('../core.js');
var dataUSFM       = require('./dataUSFM.js');

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

describe('module BBM', function() {
  var o = BBM.instance();
  var initialCount = o.numEntries();

  it('interface', function() {
    expect(BBM.instance()).to.have.all.keys('entryById',
      'entryByOn',
      'numEntries',
      'existsId',
      'entries',
      'ids',
      'ons',
      'nextId',
      'prevId');
  });

  it('content', function() {
    expect(initialCount).to.equal(75);
    var gen = o.entryById('GEN');
    expect(gen).to.have.all.keys('id', 'index', 'abbr', 'type');
    expect(gen.abbr).to.equal('Ge');
    expect(gen.index).to.equal(1);
    expect(gen.type).to.equal(1);
    expect(o.entryByOn(gen.index)).to.equal(gen);
    expect(o.existsId('REV')).to.equal(true);
    expect(o.existsId('1TH')).to.equal(true);

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
    expect(count).to.equal(initialCount);

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

  var stub = function(cb) {
    var completionCb = cb;
    return {
      onScanned: function(err, packages) {
        expect(core.PackManager.getAll()).be.equal(packages);

        var lid = 'en';
        var abbr = 'kjv';
        var pack = core.PackManager.getPackage(lid, abbr);

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

  describe('USFM format', function() {
    var parser = new USFMParser(true);
    var parserAll = new USFMParser(false);
    var usfmRndr = new USFMRenderer();
    var textRndr = new TextRenderer();

    it('USFMRenderer', function() {
      dataUSFM.verses.forEach(function(o) {
        var ref = o.data;
        var orig = ref.orig.replace(/\n/g, ' ').trim();
        var verse = parser.parseVerse(orig);
        var verseAll = parserAll.parseVerse(orig);

        var restored = verse.render(usfmRndr);
        var restoredAll = verseAll.render(usfmRndr);

        expect('\\v 0 ' + ref.parsed).to.equal(restored);
        expect('\\v 0 ' + orig).to.equal(restoredAll);
      });
    });

    it('TextRenderer', function() {
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

  describe('Bible interface', function() {
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
        expect(c1.next()).to.be.equal(null);
        expect(c1.prev()).to.be.equal(null);
        expect(c1.numVerses()).to.be.equal(0);
      });

      it('verse', function() {
        expect(v1.id()).to.be.equal('null 0: 0');
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
        v2.number = 3;
        expect(c1.addVerse.bind(c1, v2)).to.throw();
        c2.number = 3;
        expect(b1.addChapter.bind(b1, c2)).to.throw();

        v2.number = 2;
        expect(c1.addVerse.bind(c1, v2)).to.not.throw();
        c2.number = 2;
        expect(b1.addChapter.bind(b1, c2)).to.not.throw();
      });

      it('verse', function() {
        expect(v1.id()).to.be.equal(tid1 + ' 1:1');
        expect(v2.id()).to.be.equal(tid1 + ' 1:2');
        expect(v1.next()).to.be.equal(v2);
        expect(v2.next()).to.be.equal(null);
        expect(v2.prev()).to.be.equal(v1);
        expect(v1.prev()).to.be.equal(null);
      });

      it('chapter', function() {
        expect(c1.id()).to.be.equal(tid1 + ' 1');
        expect(c2.id()).to.be.equal(tid1 + ' 2');
        expect(c1.next()).to.be.equal(c2);
        expect(c2.next()).to.be.equal(null);
        expect(c2.prev()).to.be.equal(c1);
        expect(c1.prev()).to.be.equal(null);
        expect(c1.numVerses()).to.be.equal(2);
        expect(c2.numVerses()).to.be.equal(0);
      });

      it('book', function() {
      });
    });

  });
});
