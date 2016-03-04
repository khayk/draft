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

// var opts = [
//   {folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     },
//   // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
//   //{getCombined: false, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
//   // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
// ];

var bm = new lb.BibleManager;

measur.begin('detecting available bible');
bm.initialize(cfg.books());

var l = bm.list();
var i = 2;

console.log(l);

var bible = bm.bible(l[i].lang, l[i].name);

// console.log(bible.numBooks());
// console.log(bible.getToc());

measur.end();



//measur.begin('loading bible');
//var bible = lb.loadBible(input, {types: [3]});
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
