getUtilsRequireObj = (function (utilsGlobal) {
  var utilsRequire;

  if (typeof module !== 'undefined' && module.exports) {
    utilsGlobal  = global;
    utilsRequire = exports;
  } else {
    utilsRequire = utilsGlobal.utilsRequire = utilsGlobal.utilsRequire || {};
  }

  function getUtilsRequire() {
    return utilsRequire;
  }

  return getUtilsRequire;
})(this);

/// Hi resolution timer wrapper
var HiResTimer = function() {
  var startTime = null;
  var elapsed = null;

  this.start = function() {
    startTime = process.hrtime();
    elapsed = null;
  };

  this.stop = function() {
    elapsed = process.hrtime(startTime);
  };

  this.report = function() {
    if (elapsed === null) {
      this.stop();
    }

    var mls = elapsed[1] / 1000000;
    if (elapsed[0] > 0)
      console.log('%d s, %d mls', elapsed[0], mls);
    else
      console.log('%d mls', mls);
  };

  this.elapsed = function() {
    return elapsed;
  };
};

getUtilsRequireObj().HiResTimer = HiResTimer;