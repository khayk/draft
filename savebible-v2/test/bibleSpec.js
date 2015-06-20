var _      = require('lodash');
var expect = require('chai').expect;
var lb     = require('../lib/bible.js');
var tc     = require('./dataCreators.js');

var BBM             = lb.BBM;
var TocEntry        = lb.TocEntry;
var TableOfContents = lb.TableOfContents;
var TH              = lb.TH;
var Verse           = lb.Verse;
var Chapter         = lb.Chapter;
var Book            = lb.Book;
var Bible           = lb.Bible;

var encodeRef       = lb.encodeRef;
var decodeRef       = lb.decodeRef;


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
    _.each(o.ons(), function(val, key) {
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
      {"id":"HEB", "index":13, "type":1},
      {"id":"HEB", "index":70, "type":2},
    ];

    var duplicateIndex = [
      {"id":"HEB", "index":13, "type":1},
      {"id":"GEN", "index":13, "type":2},
    ];

    var invalidType = [
      {"id":"GEN", "index":13, "type":0},
      {"id":"HEB", "index":70, "type":2},
    ];

    var validMapping = [
      {"id":"ONE", "index":7, "type":1},
      {"id":"TWO", "index":5, "type":2},
      {"id":"SIX", "index":9, "type":3}
    ];

    var defaultInstance = BBM.activate();

    var activator = function(mapping) {
      BBM.activate(mapping);
      //return new BBMItem(id, index, type);
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


describe('module TableOfContents', function() {
  it('functionality', function() {
    var GEN = 'GEN';
    var EXO = 'EXO';

    var toc = new TableOfContents();
    expect(toc.first()).to.equal(null);

    toc.add(new TocEntry(GEN, undefined, 'name1', 'lname1', 'desc1'));
    expect(toc.length()).to.equal(1);
    expect(toc.have(GEN)).to.equal(true);

    var itm = toc.get(GEN);
    expect(itm.abbr).to.equal('');
    expect(itm.name).to.equal('name1');
    expect(itm.lname).to.equal('lname1');
    expect(itm.desc).to.equal('desc1');

    expect(toc.add.bind(toc,
           new TocEntry(GEN, undefined, '', '', ''))).to.throw();
    expect(toc.add(new TocEntry(EXO, '', 'name2', 'lname2', 'desc2')));
    expect(toc.length()).to.equal(2);


    var toc2 = new TableOfContents();

    toc2.add(new TocEntry(GEN, undefined, 'name3', 'lname3', 'desc3'));
    toc2.add(new TocEntry(EXO, undefined, '', '', ''));

    // after borrow only missing fields should be copied
    toc2.populate(toc, false);

    // nothing should be changed in this entry
    itm = toc2.get(GEN);
    expect(itm.name).to.equal('name3');
    expect(itm.lname).to.equal('lname3');
    expect(itm.desc).to.equal('desc3');

    // expect to see borrowed values from first table of content
    itm = toc2.get(EXO);
    expect(itm.name).to.equal('name2');
    expect(itm.lname).to.equal('lname2');
    expect(itm.desc).to.equal('desc2');


    toc.get(GEN).abbr = 'Gen';
/*
    expect(toc.validate.bind()).not.throw();
    expect(toc2.validate.bind()).not.throw();

    itm = toc.first();
    expect(itm.id).to.equal('GEN');

    itm = toc.next(itm.id);
    expect(itm.id).to.equal('EXO');

    itm = toc.prev(itm.id);
    expect(itm.id).to.equal('GEN');

    itm = toc.prev(itm.id);
    expect(itm).to.equal(null);
    toc.verify();*/
  });

  it('performance', function() {
  });
});


/*------------------------------------------------------------------------*/


describe('module TAGs', function() {
  it('supported tags', function() {
    var arrSupported = ['add', '+add*', 'add*', 'nd', '\\qt', '\\+wj'];

    arrSupported.forEach(function(a) {
      expect(TH.isSupported(a)).to.equal(true);
    });

    expect(TH.isTranslator('add')).to.equal(true);
    expect(TH.isJesusWord('wj')).to.equal(true);
    expect(TH.isOpening('wj*')).to.equal(false);
    expect(TH.isOpening('wj')).to.equal(true);
  });

  it('unsupported tags', function() {
    var arrUnsupported = ['\\www', '\\+a'];
    arrUnsupported.forEach(function(a) {
      expect(TH.isSupported(a)).to.equal(false);
    });
  });

  it('name of tag', function() {
    expect(TH.name('\\+add*')).to.equal('add');
    expect(TH.name('\\+what*')).to.equal('unknown');
    expect(TH.name('\\+what*', 'provided')).to.equal('provided');
  });
});


/*------------------------------------------------------------------------*/


describe('meta', function() {
  it('loading', function() {

  });
});


/*------------------------------------------------------------------------*/


describe('core components', function() {
  var v1 = new Verse();
  var v2 = new Verse();
  var c1 = new Chapter();
  var c2 = new Chapter();
  var b1 = new Book();
  var b2 = new Book();
  var bb = new Bible();

  describe('isolated behavior', function() {
    it('verse', function() {
      expect(v1.id()).to.be.equal('null 0: 0');
      expect(v1.vn()).to.be.equal(0);
      expect(v1.cn()).to.be.equal(0);
      expect(v1.bid()).to.be.equal('');
      expect(v1.next()).to.be.equal(null);
      expect(v1.prev()).to.be.equal(null);
    });

    it('chapter', function() {
      expect(c1.id()).to.be.equal('null 0');
      expect(c1.bid()).to.be.equal('');
      expect(c1.next()).to.be.equal(null);
      expect(c1.prev()).to.be.equal(null);
      expect(c1.numVerses()).to.be.equal(0);
    });

    it('book', function() {
      expect(b1.id).to.be.equal('');
      expect(b1.next()).to.be.equal(null);
      expect(b1.prev()).to.be.equal(null);
      expect(b1.numChapters()).to.be.equal(0);
    });

    it('bible', function() {
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
      // expect(b1.prev()).to.be.equal(null);
      // expect(b1.next()).to.be.equal(b2);
      // expect(b2.prev()).to.be.equal(b1);
      // expect(b2.next()).to.be.equal(null);
      // expect(b1.numChapters()).to.be.equal(2);
      // expect(b1.getChapter(c1.number)).to.be.equal(c1);
      // expect(b1.getChapter(c2.number)).to.be.equal(c2);
      // expect(b2.numChapters()).to.be.equal(0);
    });

    it('bible', function() {

    });

    it('references', function() {
      var tid = 'REV';
      var numChaps = 3;
      var numVerses = 11;
      var book = tc.createBook(tid, numChaps, numVerses);

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
  });


});


/*------------------------------------------------------------------------*/


describe('new test scenario', function() {
  it('simple case', function() {
  });
});

