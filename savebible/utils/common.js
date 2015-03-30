var cfg          = require('../configs.js').Configs;
var bibm         = require('../lib/bible.js');
var mkdirp       = require('mkdirp');
var fs           = require('fs');


var TextNode     = bibm.TextNode;
var CompoundNode = bibm.CompoundNode;
var Verse        = bibm.Verse;
var Book         = bibm.Book;
var TextRenderer = bibm.TextRenderer;



var textRndr     = new TextRenderer({textOnly:false, useAbbr: true});


function padNumber(number, pad) {
  var N = Math.pow(10, pad);
  return number < N ? ('' + (N + number)).slice(1) : '' + number;
}

function padString(str, pad, leftPadded) {
  if (typeof str === 'undefined') return pad;
  if (leftPadded) {
    return (pad + str).slice(-pad.length);
  } else {
    return (str + pad).substring(0, pad.length);
  }
}

function padWithSymbol(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function fwrite(file, data) {
  fs.writeFile(file, data, function(err) {
    if (err) {
      console.error('failed to write file: ', file, ', err: ', err);
    }
  });
}


function briefInfo(bible) {
  var res = '';
  var prePadded = '     ';
  bible.books.forEach(function(b) {
    var nvs = 0;
    b.chapters.forEach(function(c) {
      nvs += c.numVerses();
    });

    res += padString(b.id,            prePadded, false) +
           padString(b.numChapters(), prePadded, false) +
           nvs + '\r\n';
  });
  return res;
}


function summerizeBook(book) {
  var maxVN = 0, maxCN = 0;
  book.chapters.forEach(function(c) {
    if (maxCN < c.number)
      maxCN = c.number;
    c.verses.forEach(function(v) {
      if (maxVN < v.number)
        maxVN = v.number;
    });
  });

  var wvn = maxVN.toString().length + 1, wcn = maxCN.toString().length + 1;
  var pln = wvn > wcn ? wvn : wcn;

  var cline = '', vline = '';
  book.chapters.forEach(function(c) {
    cline += padWithSymbol(c.number, pln, ' ');
    vline += padWithSymbol(c.numVerses(), pln, ' ');
  });

  var prePadded = '     ';
  var res = padString(book.id, prePadded, false) + cline + '\r\n' +
            padString('',      prePadded, false) + vline;
  return res;
}


function summarizeBible(bible, file) {
  var res = briefInfo(bible) + '\r\n\r\n';
  bible.books.forEach(function(b) {
    res += summerizeBook(b) + '\r\n\r\n';
  });
  fwrite(file, res);
}


function saveBook(dstDir, book, on, id) {
  var rbook = book.render(textRndr);
  mkdirp(dstDir, function(err) {
    if (err) {
      console.error('mkdirp failed on dstDir: %s, err: %s', dstDir, err);
      return;
    }
    var fname = dstDir + padNumber(on, 2) + '-' + id + '.txt';
    fwrite(fname, rbook);
  });
}


function outputResult(dstDir, bible) {
  bible.sort();
  mkdirp(dstDir, function(err) {
    fwrite(dstDir + cfg.combined_name(), bible.render(textRndr));
    summarizeBible(bible, dstDir + cfg.info_name());
  });
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


exports.padNumber      = padNumber;
exports.fwrite         = fwrite;
exports.addVerse       = addVerse;
exports.summarizeBible = summarizeBible;
exports.outputResult   = outputResult;
exports.saveBook       = saveBook;