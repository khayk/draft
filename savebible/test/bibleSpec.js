var expect       = require('chai').expect;
var bible        = require('../lib/bible.js');
var helper       = require('../lib/helper.js');
var core         = require('../core.js');
var _            = require('underscore');

var BBM          = bible.BBM;
var Tags         = bible.Tags;
var USFMParser   = bible.USFMParser;
var USFMRenderer = bible.USFMRenderer;

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
  var parser   = null;
  var renderer = null;
  var bible    = null;

  var stub = function(cb) {
    var completionCb = cb;
    return {
      onScanned: function(err, packeges) {
        core.Loader.loadBook('');
        completionCb();
      }
    };
  };

  describe('USFM format', function() {
    it('loading test data from disc', function(done) {
      core.PackManager.scan('./data/test/', true, stub(done).onScanned);
    });

    it('parsing', function() {
      parser   = new USFMParser(true);
      renderer = new USFMRenderer();
      //bible    = parser.parseBible();
    });

    it('construction by parser', function() {});

    it('manual construction', function() {});
  });
});
