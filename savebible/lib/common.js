// Pad a number with leading zeros to "pad" places:
//
// @param number: The number to pad
// @param pad: The maximum number of leading zeros
//
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

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() +
           txt.substr(1).toLowerCase();
  });
}

exports.padNumber     = padNumber;
exports.padString     = padString;
exports.padWithSymbol = padWithSymbol;
exports.toTitleCase   = toTitleCase;
