var fs           = require('fs');
var path         = require('path');
var util         = require('util');
var dir          = require('node-dir');

var theBible     = require('./lib-modules/bible.js');
var helpers      = require('./lib-modules/utils.js');

var BBM          = theBible.BBM;
var Verse        = theBible.Verse;
var Chapter      = theBible.Chapter;
var Book         = theBible.Book;
var Bible        = theBible.Bible;
var USFMParser   = theBible.USFMParser;
var Renderer     = theBible.Renderer;
var TextRenderer = theBible.TextRenderer;
var USFMRenderer = theBible.USFMRenderer;

// utils exports
var HiResTimer   = helpers.HiResTimer;

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
    this.dir   = null;   // directory containing the package file
    this.ctx   = null;
  };


  var packMgr = (function() {
    var packages = [];

    return {
      display: function() {
        console.log('found %d packages', packages.length);
        packages.forEach(function (p) {
          console.log(p.dir);
        });
      },

      // discover packages in the searchLocation
      discover: function(loc, callback) {
        // cleanup existing packages
        packages = [];
        dir.files(loc, function(err, files) {
          if (err) throw err;

          var re = /package\.json/gi;
          files = files.filter(function(f) {
            return f.search(re) != -1;
          });

          // parse discovered packages
          files.forEach(function(file) {
            var str = fs.readFileSync(file, 'utf8');
            str = helpers.removeComments(str);
            var jo = null;
            try {
              jo = JSON.parse(str);
            } catch (e) {
              console.error('error %s, while parsing file %s', e, file);
              throw e;
            }

            // create and initialize package
            var pkg = new Package();
            pkg.dir = path.dirname(file);
            pkg.ctx = jo;
            packages.push(pkg);
          });

          callback(null, packages);
        });
      },

      // returns all available packages
      getAll: function() {
        return packages;
      },

      // returns an array of packages for specified language
      getByLanguage: function(languageId) {
        return packages.filter(function(p) {
          return p.ctx.lang === languageId;
        });
      },

      // returns a single package by language id and bible abbreviation
      getPackage: function(languageId, abbr) {
        var langLC = languageId.toLowerCase();
        var abbrLC = abbr.toLowerCase();

        for (var i = 0; i < packages.length; ++i) {
          var pack = packages[i];
          if (pack.ctx.lang.toLowerCase() === langLC &&
            pack.ctx.abbr.toLowerCase() === abbrLC)
            return pack;
        }
        return null;
      }
    };
  })();


  var ParserFactory = (function() {
    var usfmParser = null;
    var txtParser  = null;

    return {
      createParser: function(format) {
        if (helpers.isUndefined(format))
          throw 'format is undefined';

        if (format === 'txt') {
          if (txtParser === null)
            txtParser = new TextParser(true);
          return txtParser;
        }
        else if (format === 'usfm') {
          if (usfmParser === null)
            usfmParser = new USFMParser(true);
          return usfmParser;
        }
        else
          throw 'unknown format: ' + format;
      }
    };
  })();


  // load bible from package file
  function loadBible(pack) {
    if (!(pack instanceof Package))
      throw 'load bible expects Package object';

    var parser = ParserFactory.createParser(pack.ctx.format);
    var files = fs.readdirSync(pack.dir);

    // select files with extension that is to be parsed
    files = files.filter(function(f) {
      return ('.' + pack.ctx.format) === path.extname(f);
    });

    var obj = [];
    /// we have all files in the given directory
    files.forEach(function(f) {
      // read file content
      var cf = path.join(pack.dir, f);
      var data  = fs.readFileSync( cf, 'utf8');
      obj.push({'name': cf, 'data': data});
    });
    return parser.parseBible(obj, pack.ctx);
  }

  function onDiscovered(err, packs) {
    // all packages are discovered at this point

    packMgr.display();

    var lid = 'ru';
    var abbr = 'synod';
    var pack = packMgr.getPackage(lid, abbr);
    if (pack === null) {
      console.warn('package [%s, %s] not found', lid, abbr);
      return;
    }

    var bible = loadBible(pack);
    var renderer = new USFMRenderer();
    console.log(bible.render(renderer));
    //console.log(util.inspect(process.memoryUsage()));
  }

  function main() {
    timer.start();
    try {
      // renderTest();
      packMgr.discover('./data/test/', onDiscovered);
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
    abbr()
    name()
    desc()

    numChapters()
    addChapter(chapter)
    getChapter(number)
}

Bible {
    numBooks()
    addBook(book)
    getBook(id)
    setTOC(toc)
    getTOC()

    search(query, opt)  // returns an array of references, opt contains
}

BibleAttribute {
    abbr
    name
    desc
    year
    lang
}

TableOfContnet {
  this.raw;

  getAll()
  getOne(id) // {}
}
 */

