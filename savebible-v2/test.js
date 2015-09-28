var fs     = require('fs');
var util   = require('util');
var _      = require('lodash');
var path   = require('path');
var lb     = require('./lib/bible');
var cmn    = require('./lib/common');
var rnd    = require('./lib/renderers');
var help   = require('./helpers');

var NL = cmn.NL;

var verseTemplate   = '\\v {{number}} \\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*\n' +
        '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and\n' +
        'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*\n' +
        '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the\n' +
        'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of\n' +
        'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*\n' +
        '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the\n' +
        'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.';
var chapterTemplate = '\\c {{number}} \n\\p\n';

var vstr, cstr;
function buildTestData() {
  vstr = verseTemplate.replace('{{number}}', 1);
  cstr = chapterTemplate.replace('{{number}}', 3);
  var tmp;
  for (var i = 1; i < 10; ++i) {
    tmp = verseTemplate.replace('{{number}}', i);
    cstr += NL + tmp;
  }

  // tmp = verseTemplate.replace('{{number}}', 16);
  // cstr += NL + tmp;
}


// buildTestData();
// console.log(vstr);
// console.log(cstr);

var parser = new lb.Parser();
var usfmRenderer = new rnd.UsfmRenderer();
var textRenderer = new rnd.TextRenderer({numberOnly: false});


var bookTemplate = '' +
    '\\id \n' +
    '\\h Genesis\n' +
    '\\toc1 The First Book of Moses, called Genesis\n' +
    '\\toc2 Genesis\n' +
    '\\toc3 Gen\n' +
    '\\mt The First Book of Moses, called Genesis\n' +
    '\\{{ENCODING}}\n' +
    '\\c 1\n' +
    '\\p\n' +
    '\\q\n' +
    '\\v 1  first\n' +
    '\\c 2\n' +
    '\\p\n' +
    '\\v 1 second\n' +
    '\\c 3  \n' +
    '\\v 1 third\n' +
    '\\p\n' +
    '\\v 2 forth\n';

var book = parser.parseBook(bookTemplate);
console.log(book.render(usfmRenderer));

// verse.node.normalize();
// console.log('after normalize: ', verse.node.count());
// console.log(verse.render(usfmRenderer));


// console.log(verse.render(textRenderer));


