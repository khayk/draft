var mkdirp = require('mkdirp');
var _      = require('lodash');
var lb     = require('../lib/bible');
var fs     = require('fs');
var path   = require('path');

var MC     = lb.MC;


var CRLF = '\r\n';
var longestName = 19;
var lineMaxLen = 79;

function selectName(id) {
  var meta = MC.instance().getMeta('en');
  return meta.toc.get(id).name;
}

function createSummaryInfo(bible) {
  var res = '';
  var prePadded = '      ';

  var tbs = 0; // total books count
  var tcs = 0; // total chapters count
  var tvs = 0; // total verses count

  _.each(lb.BBM.instance().ids(), function(n, id) {
    var b = bible.getBook(id);
    if (b === null) {
      return;
    }

    var nvs = 0;
    b.chapters.forEach(function(c) {
      nvs += c.numVerses();
    });

    res += _.padRight(selectName(b.te.id), longestName, ' ') +
      _.padRight(b.numChapters(), 6, ' ') +
      nvs + CRLF;

    tcs += b.numChapters();
    tvs += nvs;
    tbs++;
  });

  res += _.pad('', longestName + 11, '-') + CRLF +
    _.padRight(tbs, longestName, ' ') +
    _.padRight(tcs, 6, ' ') +
    tvs;
  return res;
}

function preformattedBook(book) {
  var maxVN = 0,
    maxCN = 0;
  book.chapters.forEach(function(c) {
    if (maxCN < c.number)
      maxCN = c.number;
    c.verses.forEach(function(v) {
      if (maxVN < v.number)
        maxVN = v.number;
    });
  });

  var wvn = maxVN.toString().length + 1,
    wcn = maxCN.toString().length + 1;
  var pln = wvn > wcn ? wvn : wcn;

  var cline = '',
    vline = '';
  var ppad = _.pad('', longestName, ' ');
  var tres = '';

  book.chapters.forEach(function(c) {
    cline += _.padRight(c.number, pln, ' ');
    vline += _.padRight(c.numVerses(), pln, ' ');

    if (cline.length > lineMaxLen - longestName - 3) {
      tres += cline.trim() + CRLF;
      tres += ppad;

      tres += vline.trim() + CRLF + CRLF;
      tres += ppad;

      cline = '';
      vline = '';
    }
  });

  if (cline.length !== 0) {
    tres += cline.trim() + CRLF;
    tres += ppad;

    tres += vline.trim() + CRLF + CRLF;
    tres += ppad;
  }

  var res = _.padRight(selectName(book.te.id), longestName, ' ');
  res += tres.trim();

  return res;
}

function createDetailedInfo(bible) {
  var res = '';
  _.each(lb.BBM.instance().ids(), function(n, id) {
    var b = bible.getBook(id);
    if (b === null) {
      return;
    }

    if (res.length !== 0)
      res += CRLF + CRLF + _.pad('', lineMaxLen, '-') + CRLF + CRLF;
    res += preformattedBook(b);
  });
  return res;
}

function saveBibleSummary(dir, bible) {
  mkdirp.sync(dir);

  var res = createSummaryInfo(bible);
  fs.writeFileSync(path.join(dir, '/', '00-summary.txt'), res);

  res = createDetailedInfo(bible);
  fs.writeFileSync(path.join(dir, '/', '00-detailed.txt'), res);
}

exports.saveBibleSummary = saveBibleSummary;