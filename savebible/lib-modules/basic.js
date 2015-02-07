var fs           = require('fs');
var myUtils      = require('./utils.js');

// -----------------------------------------------------------------------
//                             BBMEntry
// -----------------------------------------------------------------------

var BBM_TYPE_OLD = 1;
var BBM_TYPE_NEW = 2;
var BBM_TYPE_ADD = 3;

var BBMEntry = function(id, index, abbr, type) {
  if (!type || type < BBM_TYPE_OLD || type > BBM_TYPE_ADD)
    throw 'invalid Bible book mapping entry type: ' + type;

  this.id = id;        // book unique id
  this.index = index;  // book order number
  this.abbr = abbr;    // book abbreviation
  this.type = type;    // 1 - old, 2 - new, 3 - additional
};

// -----------------------------------------------------------------------
//                   BBM (bible books mapping)
// -----------------------------------------------------------------------
var BBM = (function() {
  var instance_; // instance stores a reference to the Singleton

  function init() {
    var entries = [];
    var byId = {}; // sorted by id
    var byOn = {}; // sorted by order number (i.e. by index)

    return {
      // perform initialization from the file
      load: function(file) {
        var data = fs.readFileSync(file, 'utf8');
        this.initialize(data);
      },

      // perform initialization from the string of JSON format
      initialize: function(str) {
        // cleanup previous call result
        entries = [];
        byId = {};
        byOn = {};

        // parse from the given JSON string
        var js = JSON.parse(str);
        js.forEach(function(e) {
          var obj = new BBMEntry(e.id, e.index, e.abbr, e.type);
          entries.push(obj);
          byId[obj.id] = entries.length - 1;
          byOn[obj.index] = entries.length - 1;
        });
      },

      // get an entry by given id
      entryById: function(id) {
        return entries[byId[id]];
      },

      // get entries by order number (i.e. by index)
      entryByOn: function(on) {
        return entries[byOn[on]];
      },

      // entries count
      numEntries: function() {
        return entries.length;
      },

      // check if entry with given id exists
      existsId: function(id) {
        if (myUtils.isUndefined(byId[id]))
          return false;
        return true;
      },

      // return entries sorted by order number
      entries: function() {
        return entries;
      },

      // return ids collection
      ids: function() {
        return byId;
      },

      // return order numbers collection
      ons: function() {
        return byOn;
      }
    };
  }

  return {
    instance: function() {
      if (!instance_) {
        instance_ = init();
      }
      return instance_;
    }
  };
})();


exports.BBM = BBM;
