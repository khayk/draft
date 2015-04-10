var argv         = require('minimist')(process.argv.slice(2));
var cfg          = require('../configs.js').Configs;
var bibm         = require('../lib/bible.js');
var cmn          = require('./common.js');
var readline     = require('readline');
var dir          = require('node-dir');
var mkdirp       = require('mkdirp');
var path         = require('path');
var fs           = require('fs');
var iconv        = require('iconv-lite');


var BBM          = bibm.BBM;
var Bible        = bibm.Bible;
var Book         = bibm.Book;
var Chapter      = bibm.Chapter;
var USFMParser   = bibm.USFMParser;

var fwrite       = cmn.fwrite;

var srcDir       = cfg.en_kjv_protector().from;
var destDir      = cfg.en_kjv_protector().to;

var usfmParser   = new USFMParser();


function convertToUtf8(f) {
  var ext = path.extname(f);
  var base = path.basename(f, ext);

  var ibuff  = fs.readFileSync(f, {encoding:null});
  var obuf  = iconv.decode(ibuff, 'win1252');

  mkdirp(destDir, function(err) {
    fwrite(destDir + base + ext, obuf.toString());
  });
}


var abbrToId = (function() {
  var abbrId_ = {};
  return {
    getId: function(abbr) {
      var ref = abbrId_[abbr];
      if (ref === void 0) {
        var id = '';
        BBM.instance().entries().forEach(function(e) {
          if (e.abbr === abbr) {
            id = e.id;
          }
        });
        if (id === '')
          throw 'Unable to find an id for abbr: ' + abbr;
        abbrId_[abbr] = id;
        return abbrId_[abbr];
      }
      return ref;
    }
  };
})();


function getBook(bible, id) {
  var book = bible.getBook(id);
  if (book === null) {
    book = new Book();
    book.id = id;
    book.abbr = BBM.instance().entryById(id).abbr;
    bible.addBook(book);
  }
  return book;
}


function getChapter(bible, abbr, cn) {
  var id = abbrToId.getId(abbr);
  var book = getBook(bible, id);
  var chap = book.getChapter(cn);
  if (chap === null) {
    chap = new Chapter();
    chap.number = cn;
    book.addChapter(chap);
  }
  return chap;
}

function createUSFMVerse(vstr, vn) {
  var verse = usfmParser.parseVerse(vstr);
  verse.number = vn;
  return verse;
}

function processTextBible(file, types) {
  var bible = new Bible();
  var re  = /(.+?)\s(\d+):(\d+)/;
  var arr = null;

  // var data = fs.readFileSync(file, 'utf8');
  // var lines = data.split('\n');

  var rd = readline.createInterface({
    input: fs.createReadStream(file),
    output: process.stdout,
    terminal: false
  });


  rd.on('line', function(line) {
    try {
      arr = line.match(re);
      //console.dir(arr);
      if (arr === null) {
        console.warn('WARNING on line: %s', line);
        return;
      }

      var id = abbrToId.getId(arr[1]);
      var entry = BBM.instance().entryById(id);
      if (entry === null) {
        console.error('no entry found for id: %s', id);
        return;
      }
      var type = entry.type;
      if (types && (types.length === 0 || types.indexOf(type) !== -1)) {
	      //console.log("%s %s:%s", arr[1], arr[2], arr[3]);
	      var vstr = line.substring(arr[0].length).trim();
	      var verse = createUSFMVerse(vstr, parseInt(arr[3]));
	      getChapter(bible, arr[1], parseInt(arr[2])).addVerse(verse);
      }
    }
    catch (e) {
      console.log(e);
      console.log('ERROR while parsing BOOK: %s', id);
    }
  }).on('close', function() {
    cmn.outputResult(destDir, bible, true);
    bible.books.forEach(function(b) {
      var id = b.id;
      cmn.saveBook(destDir, b, BBM.instance().entryById(id).index, id);
    });
  });
}

var file = srcDir + '/kjvbible protector utf8.txt';
//convertToUtf8(file);
processTextBible(file, argv._);