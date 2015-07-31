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
      knownTagsOnly: true,
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

