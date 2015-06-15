var help   = require('./helpers');
var utils  = require('./utils/utils.js');

var bench         = new help.Benchmark();
var loadUSFMBible = utils.loadUSFMBible;
var lb            = require('./lib/bible');


var dropboxDir = 'C:/Users/Hayk/Dropbox';
var inputs = [
//  ['ru-synod-usfm-from-text', 'ru'],
//  ['en-kjv-usfm+', 'en']
//  ['am-eab-usfm-from-text', 'hy']
    ['zed', 'en']
  //['arm', 'hy']
];

var item = inputs[0];

bench.begin('node ready');
bench.end();

var bibles = [];

bench.begin('loadign bible');
for (var i = 0; i < 1; ++i) {
  var bible = loadUSFMBible(dropboxDir + '/' + 'Data/' + item[0] + '/');
  bibles.push(bible);
}
bench.end();

var usfmRender = new lb.USFMRenderer();

var book = bible.getBook('GEN');
var chap = book.getChapter(1);
var verse = chap.getVerse(2);

bench.begin('rendering benchmark');
for (i = 0; i < 100; ++i) {
  book.render(usfmRender);
}
bench.end();


