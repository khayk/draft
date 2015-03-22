var cfg          = require('../configs.js').Configs;
var dir          = require('node-dir');
var path         = require('path');
var bibm         = require('../lib/bible.js');
var fs           = require('fs');
var readline     = require('readline');
var mkdirp       = require('mkdirp');


var BBM          = bibm.BBM;
var Bible        = bibm.Bible;
var Book         = bibm.Book;
var Chapter      = bibm.Chapter;
var Verse        = bibm.Verse;

var USFMParser   = bibm.USFMParser;
var TextRenderer = bibm.TextRenderer;
var TextNode     = bibm.TextNode;
var CompoundNode = bibm.CompoundNode;



var textRndr   = new TextRenderer({textOnly:true});
var usfmParser = new USFMParser();


function padNumber(number, pad) {
  var N = Math.pow(10, pad);
  return number < N ? ('' + (N + number)).slice(1) : '' + number;
}


var addChildTextNode = function (node, str, from, to) {
  var text = str.substring(from, to).trim();
  if (text.length > 0)
    node.addChild(new TextNode(text, node));
};

function addNodes(node, vstr, index) {
  var found = vstr.indexOf('[', index);
  if (found !== -1) {
    addChildTextNode(node, vstr, index, found);
    var compoundNode = new CompoundNode('\\add', node);
    node.addChild(compoundNode);
    addNodes(compoundNode, vstr, found + 1);
  }
  else {
    found = vstr.indexOf(']', index);
    if (found !== -1) {
      addChildTextNode(node, vstr, index, found);
      addNodes(node.parent, vstr, found + 1);
    }
    else
      addChildTextNode(node, vstr, index, vstr.length);
  }
}

function parseVerse(vstr) {
  var verse = new Verse();
  addNodes(verse.node, vstr, 0);
  return verse;
  //return usfmParser.parseVerse(vstr);
}

function addVerse(chap, vstr, vn) {
  var verse = parseVerse(vstr);
  verse.number = vn;
  try {
    chap.addVerse(verse);
  }
  catch (e) {
    console.error(e);
  }
}

function parseChapter(chap, cstr) {
  var nums = /\d+/g;
  var arr  = nums.exec(cstr);
  var vn   = 1;

  var prevIndex = 0;
  if (arr !== null) {
    chap.number = parseInt(arr[0]);
    prevIndex = nums.lastIndex;
  }

  while ((arr = nums.exec(cstr)) !== null) {
    addVerse(chap, cstr.substring(prevIndex, arr.index), vn);
    vn = parseInt(arr[0]);
    prevIndex = nums.lastIndex;
  }
  addVerse(chap, cstr.substring(prevIndex, cstr.length), vn);

  return chap;
}


function parseBook(f, bible, id, on) {
  var book = new Book();
  book.id = id;

  var firstLine = true;
  var rd = readline.createInterface({
    input: fs.createReadStream(f),
    output: process.stdout,
    terminal: false
  });

  rd.on('line', function(line) {
    if (firstLine) {
      firstLine = false;
      return;
    }

    try {
      var tstr = line.trim();
      if (tstr.length > 0) {
        var chap = new Chapter();
        chap.parent = book;
        parseChapter(chap, tstr);
        book.addChapter(chap);
      }
    }
    catch (e) {
      console.log(e);
      console.log('ERROR while parsing BOOK: %s', id);
    }

  }).on('close', function() {
    var rbook = book.render(textRndr);
    var ppath = './uniform/eab/';
    var fname = ppath + padNumber(on, 2) + '-' + id + '.txt';

    mkdirp(ppath, function(err) {
      fs.writeFile(fname, rbook);
    });

    bible.addBook(book);
  });
}


function createKnownFormats() {
  dir.files(cfg.text_arm(), function(err, files) {
    if (err)
      throw err;

    var bible = new Bible();

    files.forEach(function(f) {
      var ext = path.extname(f);
      var base = path.basename(f, ext);

      if (ext !== '.txt') {
        console.log('Skipped: %s', f);
        return;
      }

      var arr = /(\d+)-(\w+)/g.exec(base);
      if (arr === null) {
        console.log('Unrecognized pattern: %s', base);
        return;
      }

      var on = parseInt(arr[1]);
      var id  = arr[2];
      parseBook(f, bible, id, on);
    });
  });
}


createKnownFormats();