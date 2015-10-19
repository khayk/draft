var cfg  = require('../config').cfg;
var lb   = require('../lib/bible');
var rndr = require('../lib/renderers');
var srch = require('../lib/search');
var cmn  = require('../lib/common');
var help = require('../helpers');
var path = require('path');
var fs   = require('fs-extra');

var measur = new help.Measurer();

var startupInitialization = function() {
  lb.MC.instance().linkTo('eng', 'en');
  measur.begin('node ready');
  measur.end();
};

startupInitialization();



    var parser = new lb.Parser();
    var bible  = new lb.Bible();
    var book   = parser.parseBook('\\id GEN Genesis');
    var chap   = parser.parseChapter('\\c 1');
    var chap2  = parser.parseChapter('\\c 2');


    book.index = lb.BBM.instance().onById(book.te.id);
    //book.addChapter(chap);
    bible.addBook(book);
    //book.addChapter(chap2);

    var vit = bible.verseIterator();
    var v = null;
    while ((v = vit.next()) !== null) {
      console.log(v.id());
    }
    return;


var opts = [
  //{folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     },
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  {getCombined: true, folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: true}) }
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];


var name = 'en-kjv-usfm';
var input  = cfg.bibleDir(name).from;
var output = cfg.bibleDir(name).to;


measur.begin('loading bible');
var bible = lb.loadBible(input, {types: []});
measur.end();


measur.begin('dictionary module');
var textRndr = new rndr.TextRenderer();
var meta     = lb.MC.instance().getMeta(bible.lang);
if (meta === null)
  throw new Error('Bible language is not specified or supported: ' + bible.lang);

var lexic = meta.lex;
var dict  = new srch.Dictionary('original words');
var vit   = bible.verseIterator();
var verse;
while ((verse = vit.next()) !== null) {
  var text = verse.render(textRndr);
  var ref  = lb.encodeRef(verse.ref());
  text     = lexic.removePunctuations(text);

  // process every single word
  var wordsArray = text.split(' ');
  for (var i = 0; i < wordsArray.length; ++i)
    dict.add(wordsArray[i], ref);
}
dict.optimize();
measur.end();



measur.begin('search module');
var search = new srch.Search();
var vit    = bible.verseIterator();
var verse;
while ((verse = vit.next()) !== null) {
  var text = verse.render(textRndr);
  var ref  = lb.encodeRef(verse.ref());
  text     = lexic.removePunctuations(text);

  // process every single word
  var wordsArray = text.split(' ');
  for (var i = 0; i < wordsArray.length; ++i)
    search.add(wordsArray[i], ref);
}
search.buildIndex();
measur.end();
