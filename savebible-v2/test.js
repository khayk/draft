var fs     = require('fs');
var util   = require('util');
var _      = require('lodash');
var path   = require('path');
var lb     = require('./lib/bible');
var cmn    = require('./lib/common');
var rnd    = require('./lib/renderers');
var help   = require('./helpers');

var NL = cmn.NL;

var verseTemplate   = '\\v {{number}}  \\add this is\\+add a usfm verse\\+add*\\add*.';
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


buildTestData();
// console.log(vstr);
// console.log(cstr);

var parser = new lb.Parser();
var usfmRenderer = new rnd.UsfmRenderer();
var textRenderer = new rnd.TextRenderer({numberOnly: false});

// var verse = parser.parseVerse(vstr);
// console.log(verse.render(usfmRenderer));
// console.log(verse.render(textRenderer));

var chapter = parser.parseChapter(cstr);
//console.log(chapter.render(usfmRenderer));
//console.log(chapter.render(textRenderer));

