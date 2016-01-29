var util = require('util');
var _    = require('lodash');
var log  = require('log4js').getLogger('hlp');
var lb   = require('./lib/bible');
var rndr = require('./lib/renderers');

/// Time to str
var timeToStr = function(elapsed) {
  var ms = elapsed[1] / 1000000;
  ms = Math.round(ms);
  if (elapsed[0] > 0)
    return util.format('%ds, %dms', elapsed[0], ms);
  return util.format('%dms', ms);
};

/// Convert bytes to a string representation of human friendly format
function bytesToSize(a, b, c, d, e) {
  return (b = Math, c = b.log, d = 1024, e = c(a) / c(d) | 0, a / b.pow(d, e))
    .toFixed(2) + ' ' + (e ? 'KMGTPEZY' [--e] + 'B' : 'Bytes');
}

/// Hi resolution timer wrapper
var HiResTimer = function() {
  var startTime = process.hrtime();
  var elapsed = null;

  this.start = function() {
    startTime = process.hrtime();
    elapsed = null;
  };

  this.stop = function() {
    elapsed = process.hrtime(startTime);
  };

  this.report = function() {
    log.info(this.str());
  };

  this.str = function() {
    if (elapsed === null) {
      this.stop();
    }
    return timeToStr(elapsed);
  };

  this.elapsed = function() {
    return elapsed;
  };
};


/// Measuring functionality
var Measurer = function() {
  var timer = new HiResTimer();
  var len = 80; // padding length
  var heapTotal = 0;
  var heapUsed = 0;

  this.begin = function(msg) {
    if (msg) {
      log.info(_.pad(_.pad(msg, msg.length + 2, ' '), len - 1, '-'));
    }
    var usage = process.memoryUsage();
    heapTotal = usage.heapTotal;
    heapUsed  = usage.heapUsed;
    timer.start();
  };

  this.end = function() {
    timer.stop();
    log.info('elapsed: %s', timer.str());
    var usage = process.memoryUsage();
    // var deltaTotal = usage.heapTotal - heapTotal;
    // var deltaUsed  = usage.heapUsed  - heapUsed;
    log.info('total: %s, used: %s\n',
                bytesToSize(usage.heapTotal),
                bytesToSize(usage.heapUsed));
    //log.log(util.inspect(process.memoryUsage()) + '\n');
  };

  this.elapsed = function() {
    return timer.elapsed();
  };
};


// Helper class to display search result in a human pleasant way
var SearchResultPrettifier = function(bible) {
  var bible_    = bible;
  var renderer_ = new rndr.TextRenderer();
  var lex_      = lb.MC.instance().getMeta(bible_.lang).lex;

  // create regex object
  this.createRegex = function(word, cs, ww) {
    var flags = 'gmi';
    if (cs === true) {
      flags = 'gm';
    }

    var letters = lex_.getLetters();
    //lexic_.getLetters();
    var str;
    if (ww === true)
      str = '([^%letters%]|^)%word%(?=([^%letters%]|$))';
    else
      str = '([^%letters%]|^)%word%';
    str = str.replace(/%letters%/gm, letters);
    str = str.replace(/%word%/gm, word);

    return new RegExp(str, flags);
  };

  // colorize the `part` in the 'res'
  this.colorize = function(res, part, cs, ww) {
    var re = this.createRegex(part, cs, ww);
    var arr = re.exec(res);

    if (arr === null)
      return res;

    var str = '';
    var prevIndex = 0;
    var prevMatchLength = 0;
    var match = '';
    while (arr !== null) {
      match = arr[0];
      if (str.length === 0)
        str += res.substring(0, arr.index);
      else
        str += res.substring(prevIndex + prevMatchLength, arr.index);
      str += match.green;
      prevIndex = arr.index;
      prevMatchLength = match.length;
      arr = re.exec(res);
      if (arr === null) {
        str += res.substr(prevIndex + prevMatchLength);
      }
    }
    return str;
  };

  // display the result in a use readable format
  // @param result   return value of query
  this.expend = function(result) {
    var count = result.refs.length;

    if (count < 80) {
      var that = this;
      result.refs.forEach(function(ref) {
        var dref = lb.decodeRef(ref);
        var book = bible_.getBook(lb.BBM.instance().idByOn(dref.ix));
        var chap = book ? book.getChapter(dref.cn) : null;
        var verse = chap ? chap.getVerse(dref.vn) : null;
        if (verse) {
          var res = renderer_.renderVerse(verse);
          result.words.forEach(function(w) {
            res = that.colorize(res, w, result.opts.cs, result.opts.ww);
          });
          log.info('%s  %s', _.padEnd(verse.id(), 11, ' '), res);
        }
      });
    }

    var summary = util.format('%d results for `%s`', count, result.orig);
    console.log(summary.red);
  };

  // display statistics of search module
  this.displayStatistics = function(stats) {
    log.info('CS unique words: %d', stats.cs.unique);
    log.info('CI unique words: %d', stats.ci.unique);

    if (!_.isUndefined(stats.sub)) {
      log.info('SUB   words: %d', stats.sub.unique);
      log.info('CISUB words: %d', stats.cisub.unique);
    }

    log.info('CS  total words: %d', stats.cs.total);
    log.info('CI  total words: %d', stats.ci.total);

    if (!_.isUndefined(stats.sub)) {
      log.info('SWM   total count: %d', stats.sub.total);
      log.info('CISWM total count: %s', stats.cisub.total + '\n');
    }
  };
};


exports.timeToStr              = timeToStr;
exports.bytesToSize            = bytesToSize;
exports.HiResTimer             = HiResTimer;
exports.Measurer               = Measurer;
exports.SearchResultPrettifier = SearchResultPrettifier;

require('./config').logFileLoading(__filename);
