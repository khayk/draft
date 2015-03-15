var _              = require('underscore');

var Reference = function(id, cn, vn) {
  this.id = id || 'GEN';
  this.cn = cn || 1;
  this.vn = vn || 1;
};

var NumericRef = function() {
  this.str = 'BI..C..V';
};

var ReferenceModule = function(bible, bbm) {
  var bible_ = bible;
  var bbm_   = bbm;

  return {
    // perse the string of format 'NNCCCVVV'
    // NN   0 padded integer [1-99] represents book index
    // CCC  0 padded integer [1-999] represents chapter number
    // VVV  0 padded integer [1-999] represents verse number
    parseNumericRef: function(nref) {
      var index_ = parseInt(nref.substr(0, 2));
      var cn_    = parseInt(nref.substr(2, 3));
      var vn_    = parseInt(nref.substr(5, 3));
      //var ref   = new Reference(index_, cn_, vn_);
      //return ref;
      return {
        id: index_,
        cn: cn_,
        vn: vn_
      };
    }
  };
};

var RM = new ReferenceModule('bible', 'bbm');
var r = {};
for (var i = 1; i >= 0; i--) {
  r = RM.parseNumericRef('12345678');
}

console.log(r);
//bible.searchReference('Gen');


// 01.  this is a TeXt where we want to find some words
//   .  ...
// 37.  and this is a tExt in the middle part
//   .  ...
// 77.  finally, a,  end of text, is

// A) query: is a text
//    options:  W: true, CS: true
//    result:
//    options:  W: true, CS: false
//    result: 01, 37
//    options:  W: false, CS: false, LO: && (default is AND)
//    result: 01, 37, 77


// B) query: some and end
//    options:  W: false, CS: false, LO: || (logical OR)
//    result: 01, 37, 77
//



// refList = navigate('any bible reference');
// refList = search('any sentence' [, options]);
// refList = advancedSearch('any sentence', options);


//
//   *
function search(text, options) {}

// options {
//    wholeWord bool default=true
//    ignoreCase bool default=true
// }

SearchResultManager = refList;
