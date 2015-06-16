var _      = require('lodash');
var expect = require('chai').expect;
var lb     = require('../lib/bible.js');


var BBM            = lb.BBM;

// var dataUSFM = require('./test/dataUSFM.js');
// var tvs        = dataUSFM.verses[3];
// var orig       = tvs.data.orig;
// var parsed     = tvs.data.parsed;


/*------------------------------------------------------------------------*/

describe('module BBM', function() {
  var o = BBM.instance();
  var initialCount = o.numItems();


  it('interface', function() {
    expect(BBM.instance()).to.have.all.keys(
      'items',
      'itemById',
      'itemByOn',
      'existsId',
      'idByOn',
      'ids',
      'nextId',
      'numItems',
      'onById',
      'ons',
      'prevId');
  });


  it('content', function() {
    expect(initialCount).to.be.at.least(75);
    var gen = o.itemById('GEN');
    expect(gen).to.have.all.keys('id', 'index', 'abbr', 'type');
    expect(gen.abbr).to.equal('Ge');
    expect(gen.index).to.equal(1);
    expect(gen.type).to.equal(1);
    expect(o.itemByOn(gen.index)).to.equal(gen);
    expect(o.existsId('REV')).to.equal(true);
    expect(o.existsId('1TH')).to.equal(true);
    expect(o.onById('REV')).to.equal(75);
    expect(o.idByOn(75)).to.equal('REV');


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
    expect(o.numItems()).to.equal(initialCount);
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