var argv         = require('minimist')(process.argv.slice(2));
var cfg          = require('../configs.js').Configs;
var bibm         = require('../lib/bible.js');
var cmn          = require('./utils.js');
var dir          = require('node-dir');
var readline     = require('readline');
var path         = require('path');
var fs           = require('fs');

var BBM          = bibm.BBM;
var Bible        = bibm.Bible;
var Book         = bibm.Book;
var Chapter      = bibm.Chapter;
var Verse        = bibm.Verse;

var addVerse     = cmn.addVerse;

var srcDir       = cfg.am_eab_text().from;
var destDir      = cfg.am_eab_text().to;


function parseChapter(chap, cstr) {
  var nums = /\d+/g;
  var arr  = nums.exec(cstr);
  var vn   = 1;

  var prevIndex = 0;
  if (arr !== null) {
    chap.number = parseInt(arr[0]);
    prevIndex = nums.lastIndex;
  }

  while ((arr = nums.exec(cstr)) !== null) {
    addVerse(chap, cstr.substring(prevIndex, arr.index), vn);
    vn = parseInt(arr[0]);
    prevIndex = nums.lastIndex;
  }
  addVerse(chap, cstr.substring(prevIndex), vn);

  return chap;
}


var remainingBooks = 0;

function parseBook(f, bible, id, on) {
  var book = new Book();
  book.id = id;

  var firstLine = true;
  var rd = readline.createInterface({
    input: fs.createReadStream(f),
    output: process.stdout,
    terminal: false
  });

  rd.on('line', function(line) {
    if (firstLine) {
      firstLine = false;
      return;
    }

    try {
      var tstr = line.trim();
      if (tstr.length > 0) {
        var chap = new Chapter();
        chap.parent = book;
        parseChapter(chap, tstr);
        book.addChapter(chap);
      }
    }
    catch (e) {
      console.log(e);
      console.log('ERROR while parsing BOOK: %s', id);
    }

  }).on('close', function() {
    bible.addBook(book);
    cmn.saveBook(destDir, book, on, id);
    --remainingBooks;
    if (remainingBooks === 0) {
      cmn.outputResult(destDir, bible);
    }
  });
}


function createKnownFormats(types) {
  dir.files(srcDir, function(err, files) {
    if (err)
      throw err;

    var bible = new Bible();
    remainingBooks = files.length;

    files.forEach(function(f) {
      var ext = path.extname(f);
      var base = path.basename(f, ext);

      if (ext !== '.txt') {
        console.log('Skipped: %s', f);
        return;
      }

      var arr = /(\d+)-(\w+)/g.exec(base);
      if (arr === null) {
        console.log('Unrecognized pattern: %s', base);
        return;
      }

      var on = parseInt(arr[1]);
      var id  = arr[2];
      var type = BBM.instance().entryById(id).type;

      if (types && (types.length === 0 || types.indexOf(type) !== -1))
        parseBook(f, bible, id, on);
      else
        --remainingBooks;
    });
  });
}

createKnownFormats(argv._);
