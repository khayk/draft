var cfg      = require('../config').cfg;
var lb       = require('../lib/bible');
var rndr     = require('../lib/renderers');
var srch     = require('../lib/search-v2');
var help     = require('../helpers');
var path     = require('path');
var fs       = require('fs-extra');
var _        = require('lodash');
var util     = require('util');
var readline = require('readline');

var measur = new help.Measurer();
var algo   = srch.algo;
var Reference = lb.Reference;

var startupInitialization = function() {
  lb.MC.instance().linkTo('eng', 'en');
  measur.begin('node ready');
  measur.end();
};

startupInitialization();

// var bm = new lb.BibleManager;

// measur.begin('detecting available bible');
// bm.initialize(cfg.books());

// var l = bm.list();
// console.log(l);

// for (var i = 0; i < bm.count(); ++i) {
//   var x = bm.entry(i);
//   if (null != x.sum)
//     console.log(x.sum.length);
// }
// measur.end();


var options = [
  {folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     }
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  //{getCombined: false, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];

var opt = options[0];
var dir = cfg.bibleDir('en-kjv-usfm+').from;





/*
//var dir = cfg.books() + '/' + 'en-kjv+';
//console.log(dir);



var vre = /(\\\+?(\w+)\*?\s?)/gm;
var tags = {};

measur.begin('recognizing bible tags');

var files  = fs.readdirSync(dir, 'utf8');
files.forEach(function(f) {
  console.log(f);
  var name = path.join(dir, f);
  var str = fs.readFileSync(name, 'utf8');
  vre.lastIndex = 0;
  var arr = vre.exec(str);
  while (null !== arr) {
    var match = arr[1];
    var tag   = arr[2];

    if (_.isUndefined(tags[tag]))
      tags[tag] = {o: 0, c: 0};

    if (match[match.length - 1] === '*')
      tags[tag].c++;
    else
      tags[tag].o++;
    arr = vre.exec(str);
  }
});

measur.end();

function printTags(tags, haveClosing) {
  if (haveClosing === true)
    console.log('Tags with closing');
  else
    console.log('Tags without closing');

  _.each(tags, function(val, key) {
    if (haveClosing === true && val.c > 0)
      console.log('%s - ', key, val);
    else if (haveClosing === false && val.c === 0)
      console.log('%s - ', key, val);
  });

  console.log('\n');
}

printTags(tags, true);
printTags(tags, false);
*/



measur.begin('loading bible');
var bible = lb.loadBible(dir, {types: []});
var usfm = bible.render(new rndr.IndentedUsfmRenderer());



//var book = lb.loadBook(path.join(input, '02-GENeng-kjv.usfm'));
//var book = lb.loadBook(path.join(input, '87-PHMeng-kjv.usfm'));
//measur.end();

//var verse = book.getChapter(1).getVerse(1);
//var verse = bible.getBook('SIR').getChapter(1).getVerse(1);

//var usfm = verse.render(opts[0].renderer);

//console.log(usfm);

// var ref = new Reference('JHN 12:34');
// console.log(ref.str());

// ref = new Reference('GEN 5');
// console.log(ref.str());

// ref = new Reference('MAT');
// console.log(ref.str());

// measur.begin('creating bible search');
// var bs = srch.BibleSearch(bible);
// measur.end();
