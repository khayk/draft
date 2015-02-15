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
getUtilsRequireObj().HiResTimer = function() {
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

getUtilsRequireObj().removeComments = function(data) {
  return data.replace(/^(.*?)\/\/(.*?)\r?\n/gm, '');
};


getUtilsRequireObj().isUndefined = function(obj) {
  return typeof obj === 'undefined';
};
