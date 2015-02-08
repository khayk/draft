var fs           = require('fs');
var path         = require('path');
var util         = require('util');
var dir          = require('node-dir');

var theBible     = require('./lib-modules/bible.js');
var myUtils      = require('./lib-modules/utils.js');
var basic        = require('./lib-modules/basic.js');

var BBM          = basic.BBM;

var Verse        = theBible.Verse;
var Chapter      = theBible.Chapter;
var Book         = theBible.Book;
var Bible        = theBible.Bible;
var USFMParser   = theBible.USFMParser;
var Renderer     = theBible.Renderer;
var TextRenderer = theBible.TextRenderer;
var USFMRenderer = theBible.USFMRenderer;

// utils exports
var HiResTimer   = myUtils.HiResTimer;

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

  var LocaleEntry = function() {
    this.locale = null;
    this.name   = '';
  };

  var Localization = function() {
    this.locs = {};
  };



  // -------------------------------- TOC ------------------------------------
  // Table of content item
  var TOCItem = function(id, name, abbr, lname, desc) {
    if (!BBM.instance().existsId(id))
      throw 'Unknown book id: ' + id;

    this.id    = id;
    this.name  = name;
    this.abbr  = abbr;
    this.lname = lname;
    this.desc  = desc;

    if (myUtils.isUndefined(this.name))
      throw 'Book name is missing: ' + id;

    // if the abbreviation is missing override it the default value
    if (myUtils.isUndefined(this.abbr))
      this.abbr = BBM.instance().entryById(this.id).abbr;
  };


  // table of content of the single Bible
  var TOC = function(tocJson) {
    this.toc = [];
    var self = this;
    tocJson.forEach(function(i) {
      self.toc.push(new TOCItem(i.id, i.name, i.abbr, i.lname, i.desc));
    });
  };



  // function BooLanguageEntry() {
  //   this.name = '';
  //   this.description = '';
  //   this.locale = null;
  //   this.language
  // }

  // Languages singleton
  var Languages = (function() {
    var instance_; // instance stores a reference to the Singleton

    // languages key is locale id, value is a array of packages
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

  function renderTest() {
    var testBook = './data/raw/70-MATeng-kjv-old.usfm';
    var str = fs.readFileSync(testBook, 'utf8');

    //var renderer   = new USFMRenderer();
    var renderer = new TextRenderer();


    // supported tags only
    var parser = new USFMParser(true);
    var book   = parser.parseBook(str);
    var data   = book.render(renderer);

    var verse  = book.getVerse(27, 47);
    // fs.writeFile('./data/raw/mt_27_47.txt', verse.render(renderer));
    fs.writeFile('./data/raw/output.usfm', data);

    // all tags
    // var parseAll = new USFMParser(false);
    // var bookAll  = parseAll.parseBook(str);
    // var dataAll  = bookAll.render(renderer);
    // fs.writeFile('./data/raw/outputAll.usfm', dataAll);
  }


  var Package = function() {
    this.dir       = null;   // directory containing the package file
    this.format    = '';
    this.revision  = '';
    this.bibleName = '';
    this.desc      = '';
    this.year      = '';
    this.lang      = '';
    this.toc       = null;
  };


  var PackageFinder = function() {
    // packages
    this.packages = [];

    // discover packages in the searchLocation
    this.discover = function(searchLocation, done) {
      var self = this;

      // cleanup existing packages
      this.packages = [];

      dir.files(searchLocation, function(err, files) {
        if (err) throw err;

        var re = /package\.json/gi;
        files = files.filter(function(f) {
          return f.search(re) != -1;
        });

        // parse discovered packages
        files.forEach(function(file) {
          var str = fs.readFileSync(file, 'utf8');
          str = myUtils.removeComments(str);
          var jo = JSON.parse(str);

          // create and initialize package
          var pkg       = new Package();
          pkg.dir       = path.dirname(file);
          pkg.format    = jo.format.trim();
          pkg.revision  = jo.revision.trim();
          pkg.bibleName = jo.bible_name.trim();
          pkg.year      = jo.year;
          pkg.lang      = jo.lang;
          pkg.toc       = new TOC(jo.toc);

          if ("" === pkg.bibleName)
            throw 'missing Bible name in the package file: ' + file;
          self.packages.push(pkg);
        });

        done();
      });
    };

    // returns all available packages
    this.getAll = function() {
      return this.packages;
    };

    // returns an array of packages for specified language
    this.getByLanguage = function(languageId) {
      var lang = languageId || null;
      return this.packages.filter(function(p) {
        if (lang === null)
          return true;
        return p.lang === lang;
      });
    };

    // returns a single package by language id and bible name
    this.getPackage = function(languageId, bibleName) {
      var langLC = languageId.toLowerCase();
      var bibNameLC    = bibleName.toLowerCase();

      for (var i = 0; i < this.packages.length; ++i) {
        var pack = this.packages[i];
        if (pack.lang.toLowerCase() === langLC &&
            pack.bibleName.toLowerCase() === bibNameLC)
          return pack;
      }
      return null;
    };
  };

  var ParserFactory = (function() {
    return {
      createParser: function(format) {
        if (format === 'txt')
          return new USFMParser(true);
        else if (format === 'usfm')
          return new USFMParser(true);
        else
          throw 'unknown bible format: ' + format;
      }
    };
  })();

  function loadBible(p) {
    if (!(p instanceof Package))
      throw 'load bible expects Package object';

    //console.log(p);
    var parser = ParserFactory.createParser(p.format);
    var files = fs.readdirSync(p.dir);

    // keep the format we are going to parse
    files = files.filter(function(f) {
      return ('.' + p.format) === path.extname(f);
    });

    var bible = new Bible();

    /// we have all files in the given directory
    files.forEach(function(f) {
      try {
        // read file content
        var cf = path.join(p.dir, f);
        var str  = fs.readFileSync( cf, 'utf8');
        var book = parser.parseBook(str);
        bible.books.push(book);
      }
      catch (e) {
        console.log('"%s" file processing failed. Error: %s', cf, e);
      }
    });

    return bible;
  }

  function metadataTest() {
    BBM.instance().load('./data/id-mapping.json');

    var packs = new PackageFinder();
    packs.discover('./data/test/', function() {
      // all packages are discovered at this point
      var pack     = packs.getPackage('en', 'tkjv');
      var bible    = loadBible(pack);
      var renderer = new USFMRenderer();
      console.log(bible.render(renderer));
    });
  }


  function interfaceTest() {

  }

  function main() {
    timer.start();
    try {

      renderTest();
      //metadataTest();
      //interfaceTest();

      console.log(util.inspect(process.memoryUsage()));
    } catch (e) {
      console.error('ERROR:', e);
    }

    timer.stop();
    timer.report();
  }

  main();
}());


/*

Ref(str) {
    this.id,
    this.cn,
    this.vn,
}

Verse {
    id()
    next()
    prev()
}

Chapter {
    id()
    next()
    prev()
    numVerses()
    addVerse(verse)
    getVerse(number)
}

Book {
    id()
    next()
    prev()
    numChapters()
    addChapter(chapter)
    getChapter(number)

    abbr()
    name()
    desc()
}

Bible {
    numBooks()
    addBook(book)
    getBook(id)

    search(query, opt)  // returns an array of references, opt contains
}

 */

