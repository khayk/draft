var http    = require('http');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var winston = require('winston');
var path    = require('path');
var bibm    = require('../lib/bible.js');

var BBM     = bibm.BBM;
var NIM     = require('./nim.js').NIM;


// configure logger
var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)({
      colorize: true
    }),
    new(winston.transports.File)({
      filename: 'logs/download.log',
      json: false
    })
  ]
});


// main variables
var queryNumber = 0;
var dstPath = 'downloads';
var rootUri = 'http://bible.armenia.ru/';
var tocs = [
  {addr: 'hy/toc/1.html', title:'Синодальный перевод 1876 года', name:'Библия', folder:'synod'},
  {addr: 'hy/toc/2.html', title:'The King James Bible', name:'Bible', folder:'kjv'},
  {addr: 'hy/toc/3.html', title:'Մայր Աթոռ Սուրբ Էջմիածին եւ Հայաստանի աստուածաշնչային ընկերութիւն, 1994', name:'Աստուածաշունչ', folder:'ejmiacin'},
  {addr: 'hy/toc/4.html', title:'Աստուածաշունչ մատեան Հին եւ Նոր Կտակարանաց', name:'Աստուածաշունչ', folder:'grabar'}
];





// download the content of the specified uri and fire callback when done
function getContent(uri, callback, retryCount) {
  var remaining = retryCount || 2;
  --remaining;

  var selfNumber = queryNumber++;
  http.get(uri, function(res) {
    var content = '';
    res.setEncoding('utf8');

    res.on('data', function(data) {
      content += data;
    });

    res.on('end', function() {
      logger.info('Query[%d] completed: %s', selfNumber, uri);
      callback(null, content);
    });

  }).on('error', function(err) {
    if (remaining > 0) {
      logger.warn('Query[%d] failed, retrying: %s', selfNumber, uri);
      getContent(uri, callback, remaining);
    }
    else {
      callback(err);
    }
  });
}

// handle book content
function bookContentWrap(destFolder, id) {

  function handleBookContent(err, content) {
    //var re = /value=\"(.*?)\"\s+title=\"(.*?)\">(.*?)</g;
    // while ((arr = re.exec(tocContent)) !== null) {

    // }

    var file = destFolder + id + '.html';
    fs.writeFile(file, content, function(err) {
      if (err) {
        logger.error('Failed to write file: ', file, ', err: ', err);
      }
    });
  }

  return handleBookContent;
}

// extract books list from the content of TOC
function extractBooks(tocContent, saveFolder, bibleName) {
  var re = /value=\"(.*?)\"\s+title=\"(.*?)\">(.*?)</g;
  var arr = null;

  var output  = '';
  var mapping = new NIM('mapping/' + bibleName + '.txt');

  while ((arr = re.exec(tocContent)) !== null) {
    var addr = arr[1];
    var desc = arr[2];
    var name = arr[3];

    var id = mapping.getId(name);
    output += id + ' > ' + name + ' > ' + desc + '\n';
    getContent(rootUri + addr, bookContentWrap(saveFolder, id));
  }

  fs.writeFile(saveFolder + 'index.txt', output, function(err) {
    if (err) logger.error('Failed to write file: ', file);
  });
}


function processToc(toc) {
  var uri = rootUri + toc.addr;

  var parent = dstPath + '/' + toc.folder + '/';
  // make sure that the destination directory is created
  mkdirp(parent, function(err) {
    if (err) {
      logger.error('Failed to create directory: ', parent, ', err: ' + err);
      return;
    }
    getContent(uri, function(err, content) {
      if (err) {
        logger.error('Failed to download uri: %s', uri);
        return;
      }

      fs.writeFile(parent + '_TOC.html', content, function(err) {
        if (err) {
          logger.error('Failed to write file: ', file, ', err: ', err);
        }
      });

      var books = extractBooks(content, parent, toc.folder);
    });
  });
}


logger.info('Script launched ...');

// tocs.forEach(function(toc) {
//   processToc(toc);
// });

processToc(tocs[2]);