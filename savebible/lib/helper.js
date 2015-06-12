var util            = require('util');

var timeToStr = function(elapsed) {
  var ms = elapsed[1] / 1000000;
  ms = Math.round(ms);
  if (elapsed[0] > 0)
    return util.format('%ds, %dms', elapsed[0], ms);
  return util.format('%dms', ms);
};

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
    console.log(this.str());
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


// var isUndefined = function(obj) {
//   //return typeof obj === 'undefined';
//   return obj === void 0;
// };


exports.HiResTimer     = HiResTimer;
exports.timeToStr      = timeToStr;
