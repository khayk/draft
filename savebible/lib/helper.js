helperRequire = (function (helperGlobal) {
  var helperRequire;

  if (typeof module !== 'undefined' && module.exports) {
    helperGlobal  = global;
    helperRequire = exports;
  } else {
    helperRequire = helperGlobal.helperRequire = helperGlobal.helperRequire || {};
  }

  function getHelperRequire() {
    return helperRequire;
  }

  return getHelperRequire;
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

    var ms = elapsed[1] / 1000000;
    ms = Math.round(ms);
    if (elapsed[0] > 0)
      console.log('%ds, %dms', elapsed[0], ms);
    else
      console.log('%dms', ms);
  };

  this.elapsed = function() {
    return elapsed;
  };
};


// var isUndefined = function(obj) {
//   //return typeof obj === 'undefined';
//   return obj === void 0;
// };

helperRequire().HiResTimer     = HiResTimer;
