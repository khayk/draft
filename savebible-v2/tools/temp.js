var cfg      = require('../config').cfg;
var lb       = require('../lib/bible');
var rndr     = require('../lib/renderers');
var srch     = require('../lib/search-v2');
var cmn      = require('../lib/common');
var help     = require('../helpers');
var path     = require('path');
var fs       = require('fs-extra');
var _        = require('lodash');
var util     = require('util');
var readline = require('readline');

var measur = new help.Measurer();
var algo   = srch.algo;

var startupInitialization = function() {
  lb.MC.instance().linkTo('eng', 'en');
  measur.begin('node ready');
  measur.end();
};

startupInitialization();


var dict  = new srch.Dictionary();

var text = 'It is going to be an an an an an an amazing search engine to be';
var wordsArray = text.split(' ');
for (var i = 0; i < wordsArray.length; ++i)
  dict.add(wordsArray[i], i.toString());
dict.optimize();
dict.verify();
//console.log(dict.words());
//console.log('stat: ', dict.stat());
//console.log(require('util').inspect(n, {depth: 15, colors: true}));
//return;

// console.log(dict.find('test'));
// console.log(dict.find('case'));
// console.log(dict.find('TEST'));
// console.log(dict.find('case1'));
// console.log(dict.find('cas'));
// console.log(dict.find('Test'));

// console.log(require('util').inspect(dict.root, {depth: 15, colors: true}));

var opts = [
  //{folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     },
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  {getCombined: false, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];


var name = 'en-kjv-usfm+';
var input  = cfg.bibleDir(name).from;
var output = cfg.bibleDir(name).to;

measur.begin('loading bible');
var bible = lb.loadBible(input, {types: []});
measur.end();

measur.begin('creating bible search');
var bs = srch.BibleSearch(bible);
measur.end();





function verify(expectations, opts, desc) {
  measur.begin('querying');
  expectations.forEach(function(kq) {
    var res = bs.query(kq.w, opts);
    if (res.refs.length != kq.c)
      console.error(desc + 'Query failed for "%s", expected %d to be equal %d', kq.w, kq.c, res.length);
  });
  measur.end();
}

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

var dictionary = bs.search().getDictionary();

var data = 'count: ' + dictionary.count() + '\n';
data += 'occurrence: ' + dictionary.occurrence('') + '\n';
var words = dictionary.words();


var keys = Object.keys(words);
keys.sort(function(a,b){return words[b].twc-words[a].twc;});

keys.forEach(function(k) {
  var o = words[k];
  data += k + ':' + JSON.stringify(o) + '\n';
});
fs.writeFileSync('words', data);


function query(istr, opts, count) {
  if (_.isUndefined(count))
    count = 1;
  measur.begin('querying', istr);
  for (var i = 0; i < count; ++i)
    bs.query(istr, opts);
  measur.end();
}

var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('ENTER> ');
rl.prompt();

rl.on('line', function(line) {
  var istr = line.trim();
  if (istr === 'EXIT')
    process.exit(0);
  query(istr, opts, 1);
  rl.prompt();
}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});
