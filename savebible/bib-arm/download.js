var http    = require('http');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var winston = require('winston');
var path    = require('path');
var bibm    = require('../lib/bible.js');

var BBM     = bibm.BBM;



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
var dstPath = 'result';
var rootUri = 'http://bible.armenia.ru/';
var tocs = [
  {addr: 'hy/toc/1.html', title:'Синодальный перевод 1876 года', name:'Библия', folder:'synod'},
  {addr: 'hy/toc/2.html', title:'The King James Bible', name:'Bible', folder:'kjv'},
  {addr: 'hy/toc/3.html', title:'Մայր Աթոռ Սուրբ Էջմիածին եւ Հայաստանի աստուածաշնչային ընկերութիւն, 1994', name:'Աստուածաշունչ', folder:'ejmiacin'},
  {addr: 'hy/toc/4.html', title:'Աստուածաշունչ մատեան Հին եւ Նոր Կտակարանաց', name:'Աստուածաշունչ', folder:'grabar'}
];


/// hold name/id mapping information for specified file
var NIM = function(mappingFile) {
  this.nameId = {};
  this.idName = {};

  var data   = fs.readFileSync(mappingFile, 'utf8');
  var lines  = data.split('\n');

  for (var l in lines) {
    var line = lines[l].trim();
    if (line.length === 0)
      continue;

    var arr = line.split(':');
    if (arr.length !== 2)
      throw 'Invalid mapping file: ' + mappingFile + ', entry: ' + line;
    var id   = arr[0].trim();
    var name = arr[1].trim();

    if (!BBM.instance().existsId(id))
      throw 'Invalid book id: ' + id;
    //logger.info('id: %s,  name: %s', , arr[1].trim());


    // ensure name uniquness
    if (this.getName(name) !== null)
      throw 'Name already exists: ' + name;
    this.nameId[name] = id;

    // ensure id uniquness
    if (this.getId(id) !== null)
      throw 'Id already exists: ' + id;
    this.nameId[id] = name;
  }
};

NIM.prototype.getId = function(name) {
  var ref = this.nameId[name];
  if (ref === void 0)
    return null;
  return ref;
};

NIM.prototype.getName = function(id) {
  var ref = this.idName[id];
  if (ref === void 0)
    return null;
  return ref;
};


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

tocs.forEach(function(toc) {
  processToc(toc);
});

//processToc(tocs[1]);