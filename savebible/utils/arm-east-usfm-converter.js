var argv         = require('minimist')(process.argv.slice(2));
var cfg          = require('../configs.js').Configs;
var bibm         = require('../lib/bible.js');
var cmn          = require('./common.js');
var dir          = require('node-dir');
var readline     = require('readline');
var mkdirp       = require('mkdirp');
var path         = require('path');
var fs           = require('fs');

var BBM          = bibm.BBM;
var Bible        = bibm.Bible;
var Book         = bibm.Book;
var Chapter      = bibm.Chapter;
var Verse        = bibm.Verse;

var USFMParser   = bibm.USFMParser;
var TextRenderer = bibm.TextRenderer;

var fwrite       = cmn.fwrite;
var addVerse     = cmn.addVerse;


var textRndr   = new TextRenderer({textOnly:false, useAbbr: true});
var usfmParser = new USFMParser();




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
  addVerse(chap, cstr.substring(prevIndex, cstr.length), vn);

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
    var rbook = book.render(textRndr);
    var ppath = './uniform/eab/';
    var fname = ppath + cmn.padNumber(on, 2) + '-' + id + '.txt';

    mkdirp(ppath, function(err) {
      fwrite(fname, rbook);
    });

    bible.addBook(book);
    --remainingBooks;
    if (remainingBooks === 0) {
      bible.sort();
      fwrite(ppath + cfg.combined_name(), bible.render(textRndr));
      cmn.summarizeBible(bible, ppath + cfg.info_name());
    }
  });
}


function createKnownFormats(types) {
  dir.files(cfg.text_arm(), function(err, files) {
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
