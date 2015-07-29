var help   = require('./helpers');
var utils  = require('./utils/utils.js');
var fs     = require('fs');


var bench         = new help.Benchmark();
var loadUSFMBible = utils.loadUSFMBible;
var lb            = require('./lib/bible');

var dataUSFM       = require('./test/dataUSFM.js').verses;


//var dropboxDir = 'C:/Users/Hayk/Dropbox (Personal)';
var dropboxDir = '/home/khayk/Dropbox';
var inputs = [
//  ['ru-synod-usfm-from-text', 'ru'],
  ['en-kjv-usfm+', 'en']
//  ['am-eab-usfm-from-text', 'hy']
//    ['zed', 'en']
  //['arm', 'hy']
];

var item = inputs[0];

bench.begin('node ready');
bench.end();


var usfmRender = new lb.USFMRenderer();
var textRender = new lb.TextRenderer();
var parser     = new lb.USFMParser(false);

// var ref      = dataUSFM[1].data;
// var orig     = ref.orig.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
// var verse    = parser.parseVerse(ref.orig);

// console.log('\nrendered: %s', verse.render(usfmRender));
// return;

var bibles = [];

bench.begin('loadign bible');
for (var i = 0; i < 1; ++i) {
  var bible = loadUSFMBible(dropboxDir + '/' + 'Data/' + item[0] + '/');
  bibles.push(bible);
}
bench.end();

var book = bible.getBook('GEN');
var chap = book.getChapter(1);
var verse = chap.getVerse(2);

var usfm = '';
bench.begin('usfm rendering benchmark');
for (i = 0; i < 1; ++i) {
  usfm = bible.render(usfmRender);
}
bench.end();

fs.writeFileSync('usfm', usfm);


var text = '';
bench.begin('text rendering benchmark');
for (i = 0; i < 1; ++i) {
  text = bible.render(textRender);
}
bench.end();

fs.writeFileSync('text', text);
