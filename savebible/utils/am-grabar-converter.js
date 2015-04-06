var helper         = require('../lib/helper.js');
var winston = require('winston');

var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)({
      colorize: true
    }),
    new(winston.transports.File)({
      filename: 'log_grabar.log',
      json: false
    })
  ]
});

var timer = new helper.HiResTimer();

// letters arithmetics
var LA = (function() {
  'use strict';

  var letterNum_ = {};
  var numLetter_ = {};
  var laObj = {

    init: function() {

      var charValue_ = 0x0531; // Ա ARMENIAN CAPITAL LETTER AYB
      var multiplyer = 1;
      for (var j = 1; j < 5; j++) {
        for (var i = 1; i < 10; i++) {
          var letter = String.fromCharCode(charValue_);
          var result = (i * multiplyer).toString();
          letterNum_[letter] = result;
          numLetter_[result] = letter;
          charValue_++;
        }
        multiplyer *= 10;
      }
    },

    map: function() {
      return letterNum_;
    },

    calc: function(str) {
      var res = 0;
      var prev = '';
      for (var i = str.length - 1; i >= 0; --i) {
        var num = letterNum_[str[i]];
        if (num === void 0) {
          return 0;
        }

        if (prev !== '' && num.length < prev.length) {
          return 0;
        }
        res += parseInt(num);
        prev = num;
      }
      return res;
    },

    /**
     * converts number to an alphabetic representation with armenian letters
     * @param  {number} num   number to be converted
     * @return {string}       alphabetic representation of the number
     */
    str: function(num) {
      if (num < 1 || num > 9999)
        throw 'number is out of range [1, 9999]';
      var s = num.toString();
      var res = '';
      for (var i = 0; i < s.length; ++i) {
        var N = Math.pow(10, s.length - i - 1);
        var X = N * parseInt(s[i]);
        if (X !== 0)
          res += numLetter_[X];
      }
      return res;
    }
  };

  return laObj;
}());

LA.init();

function doCalculations() {
  for (var i = 1; i < 9999; ++i) {
    var s = LA.str(i);
    var v = LA.calc(s);
    if (v !== i)
      throw 'mismatch: expected ' + i + ' was ' + v;
  }
}

String.fromCharCode();

timer.start();

for (var i = 0; i < 1; ++i)
  doCalculations();

timer.stop();
timer.report();

logger.info('success');
logger.info(LA.str(50));
//logger.info(LA.map());
//logger.info(LA.calc('aa'));
//logger.info(LA.str(5));

//logger.info(LA.load());



// logger.info(lettersMap);
