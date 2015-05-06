var argv       = require('minimist')(process.argv.slice(2));
var winston    = require('winston');
var fs         = require('fs');
var dir        = require('node-dir');
var mkdirp     = require('mkdirp');
var path       = require('path');
var bibm       = require('../lib/bible.js');
var cmn        = require('../utils/utils.js');


var BBM        = bibm.BBM;
var Bible      = bibm.Bible;
var Book       = bibm.Book;
var Chapter    = bibm.Chapter;
var USFMParser = bibm.USFMParser;

var NIM        = require('./nim.js').NIM;


// configure logger
var logger = new(winston.Logger)({
  transports: [
  new(winston.transports.Console)({
    colorize: true
  }),
  new(winston.transports.File)({
    filename: 'parser.log',
    json: false
  })
  ]
});


var mapping = null;
var usfmParser = new USFMParser();
var srcPath    = 'downloads';
var dstPath    = '../uniform/';
var tocs       = [
  {addr: 'hy/toc/1.html', title:'Синодальный перевод 1876 года', name:'Библия', folder:'synod'},
  {addr: 'hy/toc/2.html', title:'The King James Bible', name:'Bible', folder:'kjv'},
  {addr: 'hy/toc/3.html', title:'Մայր Աթոռ Սուրբ Էջմիածին եւ Հայաստանի աստուածաշնչային ընկերութիւն, 1994', name:'Աստուածաշունչ', folder:'ejmiacin'},
  {addr: 'hy/toc/4.html', title:'Աստուածաշունչ մատեան Հին եւ Նոր Կտակարանաց', name:'Աստուածաշունչ', folder:'grabar'}
];


function getBook(bible, id) {
  var book = bible.getBook(id);
  if (book === null) {
    book = new Book();
    book.id = id;
    book.abbr = BBM.instance().entryById(id).abbr;
    book.name = mapping.getName(id);
    //console.log(mapping.getName(id));

    bible.addBook(book);
  }
  return book;
}


function getChapter(bible, id, cn) {
  var book = getBook(bible, id);
  var chap = book.getChapter(cn);
  if (chap === null) {
    chap = new Chapter();
    chap.number = cn;
    book.addChapter(chap);
  }
  return chap;
}

function extractVerses(bible, id, cn, content) {
  var re = /<span.*?<sup>(\d+)<\/sup>(.*?)<\/span>/g;
  //var re = /<span.*?verse\s\{number:(\d+)\}\"><sup>\d+<\/sup>(.*?)<\/span>/g;
  var arr = null, vn = 1, vstr = '';

  while ((arr = re.exec(content)) !== null) {
    vn = parseInt(arr[1]);
    vstr = arr[2];
    vstr = vstr.replace(/<br\/>/, '');
    var verse = usfmParser.parseVerse(vstr);
    verse.number = vn;
    try {
      getChapter(bible, id, cn).addVerse(verse);
    }
    catch (e) {
      logger.error(e);
    }
  }
}

function recognizeText (bible, file) {
  var id = path.basename(file, path.extname(file));
  if (!BBM.instance().existsId(id)) {
    logger.error('Unknown id: %s', id);
    return;
  }

  var data = fs.readFileSync(file, 'utf8');
  var re = /<p\sid.*chapterNumber:(\d+)\}\"\>(.*)<\/p>/g;
  var arr;

  while ((arr = re.exec(data)) !== null) {
    var cn = parseInt(arr[1]);
    var content = arr[2];

    extractVerses(bible, id, cn, content);
  }
}

// types is an array containing book types
function discoverFiles(toc, types) {
  var bible = new Bible();

  var outDir = dstPath + '/' + toc.folder + '-ba/';
  var srcDir = srcPath + '/' + toc.folder + '/';

  mapping = new NIM('mapping/' + toc.folder + '.txt');

  // discover files
  dir.files(srcDir, function(err, files) {
    if (err)
      throw err;

    // process each file one by one
    files.forEach(function(f) {
      var ext = path.extname(f);
      var id  = path.basename(f, ext);

      try {
        if (ext !== '.html' || id === 'null') {
          logger.warn('Skipped: %s', f);
          return;
        }

        var entry = BBM.instance().entryById(id);
        if (entry === null) {
          logger.error('no entry found for id: %s', id);
          return;
        }
        var type = entry.type;
        if (types && (types.length === 0 || types.indexOf(type) !== -1)) {
          recognizeText(bible, f);
          cmn.saveBook(outDir, bible.getBook(id), BBM.instance().entryById(id).index, id, 'usfm');
        }
      }
      catch (e) {
        logger.error('ERROR: %s, ID: %s', e, id);
      }
    });

    cmn.outputResult(outDir, bible, true);
  });

  //var aaaa = '../utils/uniform/kjv-arm/';
  //cmn.saveBook(aaaa, bible.getBook(id), BBM.instance().entryById(id).index, id);
  //cmn.outputResult(aaaa, bible);
}

discoverFiles(tocs[2], argv._);

// tocs.forEach(function(toc) {
//   logger.info('Parsing: %s - %s', toc.folder, toc.title);
//   discoverFiles(toc, argv._);
// });
