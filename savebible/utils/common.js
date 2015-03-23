var fs           = require('fs');


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
      logger.error('failed to write file: ', file, ', err: ', err);
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

exports.padNumber      = padNumber;
exports.fwrite      = fwrite;
exports.summarizeBible = summarizeBible;