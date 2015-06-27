var util = require('util');
var _    = require('lodash');
var log  = require('log4js').getLogger('hlp');

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


/// Benchmarking functionality
var Benchmark = function() {
  var timer = new HiResTimer();
  var len = 80; // padding length
  var heapTotal = 0;
  var heapUsed = 0;

  this.begin = function(msg) {
    if (msg) {
      log.info(_.pad(_.pad(msg, msg.length + 2, ' '), len, '-'));
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


exports.timeToStr      = timeToStr;
exports.bytesToSize    = bytesToSize;
exports.HiResTimer     = HiResTimer;
exports.Benchmark      = Benchmark;

require('./config').logFileLoading(__filename);
