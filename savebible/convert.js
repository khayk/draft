var fs           = require('fs');
var path         = require('path');
var util         = require('util');
var moduleBible  = require('./lib-modules/bible.js');
var moduleUtils  = require('./lib-modules/utils.js');

var Verse        = moduleBible.Verse;
var Chapter      = moduleBible.Chapter;
var Book         = moduleBible.Book;
var Parser       = moduleBible.Parser;
var USFMParser   = moduleBible.USFMParser;
var Renderer     = moduleBible.Renderer;
var TextRenderer = moduleBible.TextRenderer;
var USFMRenderer = moduleBible.USFMRenderer;

/// utils exports
var HiResTimer        = moduleUtils.HiResTimer;

(function() {

  'use strict';

  var timer = new HiResTimer();
  var bible = [];

  var dropboxDir = 'c:/Users/Hayk/Dropbox (Personal)/'; // WORK
  //var dropboxDir = 'c:/Users/Hayk/Dropbox/';            // LENOVO


  function launchStressTest() {
    var dataRoot = dropboxDir + 'Private/projects/bible project/data/real/';

    var count    = 1;
    var parser   = new USFMParser();
    var renderer = new USFMRenderer();

    function launchRenderTest(bible) {
      console.log("RENDER STARTED...");
      timer.start();

      var data = '';
      bible.forEach(function(b) {
        for (var i = 0; i < count; ++i) {
          data += b.render(renderer) + '\n';
        }
      });

      console.log("bible length: %d", data.length);
      timer.stop();
      timer.report();
      console.log("RENDER COMPLETED.");

      //fs.writeFile('./data/raw/output.usfm', data);
    }


    fs.readdir(dataRoot, function(err, files) {
      if (err) throw err;
      console.log("PARSING STARTED...");
      timer.start();

      files.forEach(function(p) {
        if (path.extname(p) === '.usfm') {
          var str  = fs.readFileSync(dataRoot + p, {encoding: 'utf8'});
          var book = null;
          for (var i = 0; i < count; ++i) {
            book = parser.parseBook(str);
          }
          bible.push(book);
        }
      });

      console.log(util.inspect(process.memoryUsage()));

      timer.stop();
      timer.report();
      console.log("PARSING COMPLETED.");
      launchRenderTest(bible);
      // bible.pop();
      // bible = [];
      // parser = null;
      // renderer = null;

      // setTimeout(function() {
      //   launchStressTest();
      // }, 10);
      console.log(util.inspect(process.memoryUsage()));
    });
  }

  function removeComments(data) {
    text.match();
    return data.replace(/^(.*?)\/\/(.*?)\r?\n/gm, '');
  }

  /// table of content of the single Bible
  var BibleTOC = function() {

  };

  var BBM_TYPE_OLD = 1;
  var BBM_TYPE_NEW = 2;
  var BBM_TYPE_ADD = 3;

  var BBMEntry = function(id, index, abbr, type) {
    if (!type || type < BBM_TYPE_OLD || type > BBM_TYPE_ADD)
      throw 'invalid Bible book mapping entry type: ' + type;

    this.id    = id;
    this.index = index;
    this.abbr  = abbr;
    this.type  = type;
  };

  /// bible books mapping
  var BBM = (function() {
    var instance_; // instance stores a reference to the Singleton

    function init() {
      var entries = [];
      var byId = {};    /// sorted by id
      var byOn = {};    /// sorted by order number (i.e. by index)

      function internalSetup(data) {
        var js = JSON.parse(data);
        js.forEach(function(e) {
          var obj = new BBMEntry(e.id, e.index, e.abbr, e.type);
          entries.push(obj);
          byId[obj.id] = entries.length - 1;
          byOn[obj.index] = entries.length - 1;
        });
      }

      return {
        load: function(file) {
          var data = fs.readFileSync(file, 'utf8');
          internalSetup(data);
        },

        entryById: function(id) {
          return entries[byId[id]];
        },

        entryByOn: function(on) {
          return entries[byOn[on]];
        },

        numEntries: function() {
          return entries.length;
        },

        findId: function(id) {
          _.isUndefined(byId[id]);
        },

        /// return entries sorted by order number
        entries: function(sortMethod) {
          sortMethod = sortMethod || 1;
          entries.sort(function(a, b) {
            if (a.id < b.id)
              return -1;
            if (a.id > b.id)
              return 1;
            return 0;
            // if (sortMethod === 1)
            //   return parseInt(a.id) < parseInt(b.id);
            // else
            //   return a.id < b.id;
          });
          return entries;
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


  // var Package = function() {
  //   this.format = '';
  //   this.revision = '';
  //   this.year = '';
  //   this.name = '';
  //   this.lang = '';
  // };

  // Package.prototype.simple = function() {

  // };
  function metadataTest() {
    BBM.instance().load('./data/id-mapping.json');
    console.log(BBM.instance().numEntries());
    console.log(BBM.instance().entries());
  }

  function renderTest() {
    var testBook = './data/raw/70-MATeng-kjv-old.usfm';
    var str = fs.readFileSync(testBook, 'utf8');

    //var renderer   = new USFMRenderer();
    var renderer = new TextRenderer();


    /// supported tags only
    var parser = new USFMParser(true);
    var book   = parser.parseBook(str);
    var data   = book.render(renderer);

    var verse  = book.getVerse(27, 47);
    // fs.writeFile('./data/raw/mt_27_47.txt', verse.render(renderer));
    fs.writeFile('./data/raw/output.usfm', data);

    /// all tags
    // var parseAll = new USFMParser(false);
    // var bookAll  = parseAll.parseBook(str);
    // var dataAll  = bookAll.render(renderer);
    // fs.writeFile('./data/raw/outputAll.usfm', dataAll);
  }

  function main() {
    try {
      //renderTest();
      metadataTest();
      console.log(util.inspect(process.memoryUsage()));
    } catch (e) {
      console.error('ERROR:', e);
    }
  }

  main();
}());


