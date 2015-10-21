/*------------------------------------------------------------------------*/
// writing into buffer

var buf = new Buffer(100);
var names = ['Hayk', 'Հայկ', 'Айк'];
var offset = 0;
var written = 0;
var result = '';

var bufferWriter = function(str) {
  written = buf.write(str, offset);
  offset += written;
  return offset;
};

for (var i = 0; i < 1000000; ++i) {
  offset = 0;
  written = 0;
  names.forEach(bufferWriter);
  result = buf.toString('utf8', 0, offset);
}


/*------------------------------------------------------------------------*/
// saving configuration file
nconf.save(function (err) {
  if (err) {
    console.log(err);
    return;
  }
  fs.readFile('./config/config.json', function (err, data) {
    console.dir(JSON.parse(data.toString()));
  });
});


/*------------------------------------------------------------------------*/
// logging types
logger.trace('trace');
logger.debug('debug');
logger.info('info');
logger.warn('warn');
logger.error('error');
logger.fatal('fatal');


/*------------------------------------------------------------------------*/
// launch istanbul windows
// istanbul cover %APPDATA%/npm/node_modules/mocha/bin/_mocha -- -R spec
// linux: istanbul cover _mocha -- -R spec
//


/*------------------------------------------------------------------------*/
// build index and navigate through bible and search



  var inputs = [
    ['ru-synod-usfm-from-text', 'ru', 'synod'],
    ['en-kjv-usfm',            'en', 'kjv'],
    ['am-eab-usfm-from-text',   'hy', 'eab']
    //['zed', 'en', 'zed']
    //['arm', 'hy', 'arm']
  ];
  var bsArray = [];
  var pretty  = {};

  var opts = {cs: false, ww: false, op: 'and'};

  inputs.forEach(function(input) {
    measur.begin('loading bible: ' + input[0]);
    var bible = lb.loadBible(cfg.bibleDir(input[0]).from, {
      ignoredTags: TH.arrayIgnored(),
      strictFilename: false
    });
    measur.end();

    if (bible.lang === '')
      bible.lang = input[1];
    bible.abbr = input[2];

    measur.begin('building index');
    var bs = new BibleSearch(bible);
    bsArray.push(bs);
    measur.end();

    pretty[bible.lang] = new help.SearchResultPrettifier(bible);
    pretty[bible.lang].displayStatistics(bs.search().getStatistics());
  });

  console.log(Object.keys(pretty));

  var renderer = new lb.TextRenderer({textOnly: false});
  var rl = readline.createInterface(process.stdin, process.stdout);
  rl.setPrompt('ENTER> ');
  rl.prompt();

  rl.on('line', function(line) {
    var istr = line.trim();
    if (istr === 'EXIT')
      process.exit(0);

    if (istr.length > 0 && istr[0] === '*') {
      // perform navigation only
      istr = istr.substring(1).trim();
      bsArray.forEach(function(bs) {
        var verse = bs.nav(istr);
        if (verse !== null)
          log.info(verse.render(renderer));
      });
    }
    else {
      var notFound = bsArray.length;
      measur.begin('querying', istr);
      bsArray.forEach(function(bs) {
        var pp = pretty[bs.bible().lang];

        var res = bs.query(istr, opts);
        if (res.refs.length === 0)
          notFound--;
        else
          pp.expend(res);

        // print not found only if the text is not found in all available bibles
        if (notFound === 0)
          pp.expend(res);
      });
      measur.end();
    }

    rl.prompt();

  }).on('close', function() {
    console.log('Have a great day!');
    process.exit(0);
  });



/*------------------------------------------------------------------------*/
// print the content of the verse

var bbb = lb.loadBook(cfg.inputDir() + '/' + '01-GENeng-kjv.usfm');
console.log(require('util').inspect(bbb.getChapter(1).getVerse(1).node, {depth: 15, colors: true}));




/*------------------------------------------------------------------------*/
// search verification for kjv+ version

var opts = {cs: true, ww: true, op: 'and'};
var knownQueries_CS_WW = [
  {w: 'Mat', c: 0},
  {w: 'the', c: 26878},
  {w: 'a', c: 7199},
  {w: 'abo', c: 0},
  {w: 'bec', c: 0},
  {w: 'The', c: 2019},
  {w: 'THE', c: 11},
  {w: 'that', c: 11313},
  {w: 'than', c: 532},
];
verify(knownQueries_CS_WW, opts, 'CS && WW: ');


opts.cs = true;
opts.ww = false;
var knownQueries_CS = [
  {w: 'Mat', c: 67},
  {w: 'the', c: 30690},
  {w: 'a', c: 7199},   // 31305 - without restriction
  {w: 'abo', c: 1234},
  {w: 'bec', c: 1358},
  {w: 'The', c: 5093},
  {w: 'THE', c: 11},
  {w: 'that', c: 11314},
  {w: 'than', c: 694},
  {w: 'the', c: 30690}
];
verify(knownQueries_CS, opts, 'CS: ');


opts.cs = false;
opts.ww = true;
var knownQueries_WW = [
  {w: 'Mat', c: 0},
  {w: 'the', c: 27376},
  {w: 'a', c: 7369},
  {w: 'abo', c: 0},
  {w: 'bec', c: 0},
  {w: 'The', c: 27376},
  {w: 'THE', c: 27376},
  {w: 'that', c: 11534},
  {w: 'THAT', c: 11534},
  {w: 'than', c: 532},
];
verify(knownQueries_WW, opts, 'WW: ');


opts.cs = false;
opts.ww = false;
var knownQueries_NO_RESTRICTION = [
  {w: 'Mat', c: 215},
  {w: 'the', c: 31312},
  {w: 'a', c: 7369},     // 32917 - without restriction
  {w: 'of', c: 20728},    // 21244 - without restriction
  {w: 'abo', c: 1245},
  {w: 'bec', c: 1554},
  {w: 'The', c: 31312},
  {w: 'THE', c: 31312},
  {w: 'that', c: 11535},
  {w: 'THAT', c: 11535},
  {w: 'than', c: 696},
];
verify(knownQueries_NO_RESTRICTION, opts, '..: ');
