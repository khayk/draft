var argv         = require('minimist')(process.argv.slice(2));
var cfg          = require('../configs.js').Configs;
var bibm         = require('../lib/bible.js');
var cmn          = require('./common.js');
var dir          = require('node-dir');
var mkdirp       = require('mkdirp');
var path         = require('path');
var fs           = require('fs');

var BBM          = bibm.BBM;
var Bible        = bibm.Bible;

var fwrite       = cmn.fwrite;
var iconv        = require('iconv-lite');

var dest         = './uniform/synod/';



// var ibuff  = fs.readFileSync(cfg.text_rus() + '/61_3in.txt', {encoding:null});
// var ppath  =
// var obuf  = iconv.decode(ibuff, 'win1251');

// mkdirp(ppath, function(err) {
//   fwrite(ppath + '61_3in.txt', obuf.toString());
// });


function parseBook(f, bible, id, on) {
  var data = fs.readFileSync(f, 'utf8');
  var reChap     = /===(\d+)===/;
  var reBookNmae = /^==\s[\s\S]+?\s==$/;
  var reVerse    = /\d+\s/;

  // obuf contains text in UTF-8 format
  var lines = data.split('\n');
  for (var l in lines) {
    var line = lines[l];

  }
}

function convertToUtf8(f) {
  var ext = path.extname(f);
  var base = path.basename(f, ext);

  var ibuff  = fs.readFileSync(f, {encoding:null});
  var obuf  = iconv.decode(ibuff, 'win1251');

  mkdirp(dest, function(err) {
    fwrite(dest + base + ext, obuf.toString());
  });
}

function createKnownFormats(types) {
  dir.files(cfg.text_rus(), function(err, files) {
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
  });
}

createKnownFormats(argv._);
