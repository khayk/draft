var fs           = require('fs');
var path         = require('path');
var util         = require('util');
var dir          = require('node-dir');
var _            = require('underscore');

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
    return data.replace(/^(.*?)\/\/(.*?)\r?\n/gm, '');
  }

  function isUndefined(obj) {
    return typeof obj === 'undefined';
  }


  /// ------------- Bible Books Mapping Singleton object ----------------------
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

      return {
        /// perform initialization from the file
        load: function(file) {
          var data = fs.readFileSync(file, 'utf8');
          this.initialize(data);
        },

        /// perform initialization from the string of json format
        initialize: function(str) {
          var js = JSON.parse(str);
          js.forEach(function(e) {
            var obj = new BBMEntry(e.id, e.index, e.abbr, e.type);
            entries.push(obj);
            byId[obj.id] = entries.length - 1;
            byOn[obj.index] = entries.length - 1;
          });
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

        existsId: function(id) {
          if ( isUndefined(byId[id]) )
            return false;
          return true;
        },

        /// return entries sorted by order number
        entries: function() {
          return entries;
        },

        /// return ids collection
        ids: function() {
          return byId;
        },

        /// return order numbers collection
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

  var LocaleEntry = function() {
    this.locale = null;
    this.name   = '';
  };

  var Localization = function() {
    this.locs = {};
  };



  /// -------------------------------- TOC ------------------------------------
  /// Table of content item ---------------------------------------------------
  var TocItem = function(id, name, abbr, lname, desc) {
    if (!BBM.instance().existsId(id))
      throw 'Unknown book id: ' + id;

    this.id    = id;
    this.name  = name;
    this.abbr  = abbr;
    this.lname = lname;
    this.desc  = desc;

    if (isUndefined(this.name))
      throw 'Book name is missing: ' + id;

    /// if the abbreviation is missing override it the default value
    if (isUndefined(this.abbr))
      this.abbr = BBM.instance().entryById(this.id).abbr;
  };


  /// table of content of the single Bible ------------------------------------
  var TOC = function(tocJson) {
    this.toc = [];
    var self = this;
    tocJson.forEach(function(i) {
      self.toc.push(new TocItem(i.id, i.name, i.abbr, i.lname, i.desc));
    });
  };



  // function BooLanguageEntry() {
  //   this.name = '';
  //   this.description = '';
  //   this.locale = null;
  //   this.language
  // }

  /// Languages singleton
  var Languages = (function() {
    var instance_; // instance stores a reference to the Singleton

    /// languages key is locale id, value is a array of packages
    var languages = {};

    function init() {

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

  var PackageKey = function() {
    this.name = '';
    this.lang = '';
  };

  var Package = function() {
    this.dir = null;   /// directory containing the package file
    this.format = '';
    this.revision = '';
    this.book = '';
    this.desc = '';
    this.year = '';
    this.lang = '';
    this.toc = null;
  };

  var PackageFinder = function() {
    /// packages
    this.packages = [];

    this.discover = function(searchLocation, done) {
      var self = this;

      dir.files(searchLocation, function(err, files) {
        if (err) throw err;

        var re = /package\.json/gi;
        files = files.filter(function(f) {
          return f.search(re) != -1;
        });

        console.log(files);

        /// parse discovered packages
        files.forEach(function(file) {
          var str = fs.readFileSync(file, 'utf8');
          str = removeComments(str);
          var jo = JSON.parse(str);

          /// create and initialize package
          var pkg      = new Package();
          pkg.dir      = path.dirname(file);
          pkg.format   = jo.format;
          pkg.revision = jo.revision;
          pkg.book     = jo.book;
          pkg.year     = jo.year;
          pkg.lang     = jo.lang;
          pkg.toc      = new TOC(jo.toc);

          self.packages.push(pkg);
        });

        done();
      });
    };

    /// returns all available packages
    this.getAll = function() {
      return this.packages;
    };

    /// returns an array of packages for specified language
    this.getByLanguage = function(languageId) {
      var lang = languageId || null;
      return this.packages.filter(function(p) {
        if (lang === null)
          return true;
        return p.lang === lang;
      });
    };

    /// returns a single package by language id and bible name
    this.getPackage = function(languageId, book) {

    };
  };


  function metadataTest() {
    var obj = BBM.instance();
    obj.load('./data/id-mapping.json');

    var pfinder = new PackageFinder();
    pfinder.discover('./data/test/', function() {
      /// get the first packages
      var pack = pfinder.getAll()[0];
      //pfinder.l

      console.log(pack.toc);
      //console.log(pfinder.getAll());
    });

    // console.log(obj.numEntries());
    // console.log(obj.entries());
    // console.log(obj.ons());
    // console.log(obj.ids());
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


