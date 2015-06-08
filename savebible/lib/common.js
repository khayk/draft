// common functions for bible module
;(function() {
  'use strict';

  // Pad a number with leading zeros to "pad" places:
  //
  // @param  {number} num   The number to pad
  // @param  {string} pad   The maximum number of leading zeros
  // @return {string}       Padded string
  function padNumber(num, pad) {
    var N = Math.pow(10, pad);
    return num < N ? ('' + (N + num)).slice(1) : '' + num;
  }

  function padString(str, pad, leftPadded) {
    if (typeof str === 'undefined') {
      return pad;
    }
    if (leftPadded) {
      return (pad + str).slice(-pad.length);
    } else {
      return (str + pad).substring(0, pad.length);
    }
  }

  // Pad number with specified symbol and width
  //
  // @param  {number} n      The number to pad
  // @param  {number} width  Resulting padding width
  // @param  {string} z      Symbol to pad with
  // @return {string}        Padded string
  function padWithSymbol(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  function toTitleCase(str) {
    // HAYK:TODO check this regular expression for multilingual strings
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() +
             txt.substr(1).toLowerCase();
    });
  }

  exports.padNumber     = padNumber;
  exports.padString     = padString;
  exports.padWithSymbol = padWithSymbol;
  exports.toTitleCase   = toTitleCase;

})();
