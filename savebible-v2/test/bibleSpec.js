var _      = require('lodash');
var expect = require('chai').expect;
var lb     = require('../lib/bible.js');


var BBM            = lb.BBM;


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