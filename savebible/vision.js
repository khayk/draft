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

