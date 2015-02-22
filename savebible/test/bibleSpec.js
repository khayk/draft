var expect = require('chai').expect;
var bibleModule = require('../lib/bible.js');
var helper = require('../lib/helper.js');
var core = require('../core.js');
var _ = require('underscore');
var dataUSFM = require('./dataUSFM.js');

var BBM = bibleModule.BBM;
var Tags = bibleModule.Tags;
var USFMParser = bibleModule.USFMParser;
var USFMRenderer = bibleModule.USFMRenderer;
var TextRenderer = bibleModule.TextRenderer;

describe('stress BBM module', function() {
  var o = BBM.instance();
  var initialCount = o.numEntries();

  it('interface', function() {
    expect(BBM.instance()).to.have.all.keys('entryById',
      'entryByOn',
      'numEntries',
      'existsId',
      'entries',
      'ids',
      'ons');
  });

  it('content', function() {
    expect(initialCount).to.equal(75);
    var gen = o.entryById('GEN');
    expect(gen).to.have.all.keys('id',
      'index',
      'abbr',
      'type');
    expect(gen.abbr).to.equal('Ge');
    expect(gen.index).to.equal(1);
    expect(gen.type).to.equal(1);
    expect(o.entryByOn(gen.index)).to.equal(gen);
    expect(o.existsId('REV')).to.equal(true);
    expect(o.existsId('1TH')).to.equal(true);

    expect(o.numEntries()).to.equal(initialCount);

    // elements located in a ascending order
    var prev = null;
    _.each(o.ids(), function(key, val) {
      if (prev !== null)
        expect(prev).to.be.below(key);
      else
        prev = key;
    });
  });

  it('immutability', function() {
    // the number of entries should not be altered if queries missing entry
    expect(o.entryById('NOT FOUND')).to.equal(undefined);
    expect(o.existsId('NONE')).to.equal(false);
    expect(o.numEntries()).to.equal(initialCount);
  });
});


describe('TAGs module', function() {
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


describe('Core modules', function() {
  var bible = null;

  var stub = function(cb) {
    var completionCb = cb;
    return {
      onScanned: function(err, packages) {
        expect(core.PackManager.getAll()).be.equal(packages);

        var lid = 'ru';
        var abbr = 'synod';
        var pack = core.PackManager.getPackage(lid, abbr);

        expect(pack).to.not.equal(null);
        bible = core.Loader.loadBible(pack);

        // start verification
        expect(bible.abbr).to.equal(pack.ctx.abbr);
        expect(bible.name).to.equal(pack.ctx.name);
        expect(bible.desc).to.equal(pack.ctx.desc);
        expect(bible.year).to.equal(pack.ctx.year);
        expect(bible.lang).to.equal(pack.ctx.lang);
        expect(bible.toc).to.be.an.instanceof(bibleModule.TableOfContent);


        //console.log(packages);
        //core.Loader.loadBook('');
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

    // it('construction by parser', function() {});

    // it('manual construction', function() {});
  });
});
