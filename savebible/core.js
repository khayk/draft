var bibl   = require('./lib/bible.js');
var dir    = require('node-dir');
var fs     = require('fs');
var path   = require('path');


var Package = function() {
  this.dir = null; // directory containing the package file
  this.ctx = null;
};

var removeComments = function(data) {
  return data.replace(/^(.*?)\/\/(.*?)\r?\n/gm, '');
};

// Manage bible packages, search, load ...
var PackManager = (function() {
  var packages = [];

  return {
    // Scan for available bible packages at the specified directory
    // if newScan is false previous results will not be deleted
    scan: function(loc, newScan, callback) {
      var clean = newScan || true;
      if (clean === true)
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
          str = removeComments(str);
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

    display: function() {
      console.log('found %d packages', packages.length);
      packages.forEach(function(p) {
        console.log(p.dir);
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


var Loader = (function() {
  return {
    loadBook: function(file) {
      var data = fs.readFileSync(file, 'utf8');
      var parser = bibl.ParserFactory.createParser(path.extname(file));
      return parser.parseBook(parser);
    },

    // load bible from package file
    loadBible: function(pack) {
      if (!(pack instanceof Package))
        throw 'load bible expects Package object';

      var parser = bibl.ParserFactory.createParser(pack.ctx.format);
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
        var data = fs.readFileSync(cf, 'utf8');
        obj.push({
          'name': cf,
          'data': data
        });
      });
      return parser.parseBible(obj, pack.ctx);
    }
  };
})();

module.exports.PackManager = PackManager;
module.exports.Loader      = Loader;