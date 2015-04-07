
var http    = require('http');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var winston = require('winston');
var path    = require('path');


// configure logger
var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)({
      colorize: true
    }),
    new(winston.transports.File)({
      filename: 'draft.log',
      json: false
    })
  ]
});


// main variables
dstPath = 'result';
rootUri = 'http://bible.armenia.ru/';
tocs = [
  {addr: 'hy/toc/1.html', title:'Синодальный перевод 1876 года', name:'Библия', folder:'synod'},
  {addr: 'hy/toc/2.html', title:'The King James Bible', name:'Bible', folder:'kjv'},
  {addr: 'hy/toc/3.html', title:'Մայր Աթոռ Սուրբ Էջմիածին եւ Հայաստանի աստուածաշնչային ընկերութիւն, 1994', name:'Աստուածաշունչ', folder:'ejmiacin'},
  {addr: 'hy/toc/4.html', title:'Աստուածաշունչ մատեան Հին եւ Նոր Կտակարանաց', name:'Աստուածաշունչ', folder:'grabar'}
];


// download the content of the specified uri and fire callback when done
function getContent(uri, callback) {
  http.get(uri, function(res) {
    var content = '';
    res.setEncoding('utf8');

    res.on('data', function(data) {
      content += data;
    });

    res.on('end', function() {
      callback(null, content);
    });

  }).on('error', function(err) {
    callback(err);
  });
}

// handle book content
function handleBookContent(err, content) {
  //var re = /value=\"(.*?)\"\s+title=\"(.*?)\">(.*?)</g;
  // while ((arr = re.exec(tocContent)) !== null) {

  // }

  fs.writeFile(saveFolder + 'ttt.html', content, function(err) {
    if (err) {
      logger.error('failed to write file: ', file, ', err: ', err);
      // TODO: do something to retry
    }
  });
}

// extract books list from the content of TOC
function extractBooks(tocContent, saveFolder, bibleName) {
  var re = /value=\"(.*?)\"\s+title=\"(.*?)\">(.*?)</g;
  var arr = null;

  var output = '';
  while ((arr = re.exec(tocContent)) !== null) {
    var addr = arr[1];
    var desc = arr[2];
    var name = arr[3];

    output += name + '\n';

    //getContent(rootUri + addr, handleBookContent);
    //return;
    //logger.info("addr: %s, desc: %s, name: %s", addr, desc, name);
  }

  // fs.writeFile(saveFolder + bibleName + '.txt', output, function(err) {
  //   if (err) logger.error('failed to write file: ', file);
  // });
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

      fs.writeFile(parent + 'toc.html', content, function(err) {
        if (err) {
          logger.error('failed to write file: ', file, ', err: ', err);
        }
      });

      var books = extractBooks(content, parent, toc.folder);
    });
  });
}

tocs.forEach(function(toc) {
  processToc(toc);
});

//processToc(tocs[0]);
