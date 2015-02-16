var expect = require('chai').expect;
var bible  = require('../lib/bible.js');
var bbm    = bible.BBM;

describe('stress BBM module', function() {
  var o = bbm.instance();
  var initialCount = o.numEntries();

  it('interface', function() {
    expect(bbm.instance()).to.have.all.keys('entryById',
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
  });

  it('immutability', function() {
    // the number of entries should not be altered if queries missing entry
    expect(o.entryById('NOT FOUND')).to.equal(undefined);
    expect(o.existsId('NONE')).to.equal(false);
    expect(o.numEntries()).to.equal(initialCount);
  });

  it('some pending test 2');
 });

