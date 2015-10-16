var argv         = require('minimist')(process.argv.slice(2));
var cfg          = require('../configs.js').Configs;
var bibm         = require('../lib/bible.js');
var cmn          = require('./utils.js');
var dir          = require('node-dir');
var mkdirp       = require('mkdirp');
var path         = require('path');
var fs           = require('fs');

var BBM          = bibm.BBM;
var Bible        = bibm.Bible;
var Book         = bibm.Book;
var Chapter      = bibm.Chapter;
var USFMParser   = bibm.USFMParser;


var fwrite       = cmn.fwrite;
var iconv        = require('iconv-lite');


var srcDir       = cfg.ru_synod_text().from;
var destDir      = cfg.ru_synod_text().to;

var usfmParser   = new USFMParser();


function parseBook(f, bible, id, on) {
  var data = fs.readFileSync(f, 'utf8');
  var reChap     = /===\s(.+?)\s===/;
  var reBookName = /^==\s(.+?)\s==$/;
  var reVerse    = /^(\d+)\s/;

  // obuf contains text in UTF-8 format
  var lines = data.split('\n');
  var book = null;
  var chap = null;
  var arr  = null;
  var line = '';
  for (var l in lines) {
    line = lines[l].trim();
    arr = null;
    //console.log(line);

    try {
      if (line.length === 0)
        continue;

      arr = reVerse.exec(line);
      if (arr === null) {
        arr = reChap.exec(line);
        if (arr === null) {
          arr = reBookName.exec(line);
          if (arr === null) {
            var ref = id;
            if (chap) {
              ref += ' ' + chap.number.toString();
              chap.addHeading(line);
              //console.info('HEADING: {REF} %s - %s', ref, line);
            }
            else {
              book.preface.push(vstr);
              //console.warn('WARNING: unexpected line: REF: %s - %s', ref, line);
            }
            continue;
          }
          book = new Book();
          book.id = id;
          book.name = arr[1].trim();
        }
        else {
          var cn = parseInt(arr[1].trim());
          if (!isNaN(cn)) {
            chap = new Chapter();
            chap.number = cn;
            book.addChapter(chap);
          }
          else {
          }
        }
      }
      else {
        var vstr = line.substring(arr[0].length);
        //console.log(vstr);

        //vstr = vstr.replace(/\[(.*?)\]/g, "\\add $1\\add*");
        vstr = vstr.replace(/\[/g, '\\add ');
        vstr = vstr.replace(/\]/g, '\\add*');
        vstr = vstr.replace(/_(.*?)_/g, "\\add $1\\add*");

        if (chap === null) {
          book.preface.push(vstr);
          continue;
        }

        // let the USFM parser to process with verse
        var verse = usfmParser.parseVerse(vstr);
        verse.number = parseInt(arr[1].trim());
        chap.addVerse(verse);
      }
    }
    catch (e) {
      console.error('Exception raised while processing file: %s, error: %s', id, e);
    }
  }

  bible.addBook(book);
  cmn.saveBook(destDir, book, on, id, 'usfm');
}

function convertToUtf8(f) {
  var ext = path.extname(f);
  var base = path.basename(f, ext);

  var ibuff  = fs.readFileSync(f, {encoding:null});
  var obuf  = iconv.decode(ibuff, 'win1251');

  mkdirp(destDir, function(err) {
    fwrite(destDir + base + ext, obuf.toString());
  });
}



function discoverFiles(types) {
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

      var entry = BBM.instance().entryById(id);
      if (entry === null) {
        console.error('no entry found for id: %s', id);
        return;
      }
      var type = entry.type;

      if (types && (types.length === 0 || types.indexOf(type) !== -1))
        parseBook(f, bible, id, on);
      else
        --remainingBooks;
    });

    cmn.outputResult(destDir, bible);
  });
}

discoverFiles(argv._);

// var bible = new Bible();
// parseBook('c:/Users/Hayk/Dropbox/Data/txt-rus-synod/64-2TI.txt', bible, '2TI', 64);