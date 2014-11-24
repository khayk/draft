(function() {

var fs   = require('fs');
var path = require('path');

function CharacterCollector() {
   this.chars = {};
   this.rm = {};

   this.init = function() {
      this.rm[String.fromCharCode(parseInt("2019", 16))] = String.fromCharCode(parseInt("55B", 16));
      this.rm[String.fromCharCode(parseInt("201c", 16))] = String.fromCharCode(parseInt("ab", 16));
      this.rm[String.fromCharCode(parseInt("201d", 16))] = String.fromCharCode(parseInt("bb", 16));
      this.rm[String.fromCharCode(parseInt("3A", 16))] = String.fromCharCode(parseInt("589", 16));
   };

   this.collect = function(str) {
      for (var i = 0; i < str.length; ++i)
         this.chars[str[i]] = parseInt(str.charCodeAt(i), 16);
   };

   this.correct = function(str) {
      console.log(typeof str);
      // var cpy = [];
      for (var i = 0; i < str.length; ++i) {
         for (var key in this.rm) {
            if ( str[i] === key ) {
               //cpy.push(this.rm[key]);
               str.replaceAt(i, this.rm[key]);
               break;
            }
         }
         //cpy.push(str[i]);
      }
      return str;
      // return cpy.toString();
   }

   this.display = function(filter) {
      for (var key in this.chars) {
         if (filter) {
            if (filter(key))
               console.log(key + " -> ", this.chars[key]);
         }
         else {
            console.log(key + " -> ", this.chars[key]);
         }
      }
   };
}

var cc = new CharacterCollector();

// cc.collect("HAYK");
// cc.collect("hayk");
// cc.collect("Айк");
// cc.collect("Հա’յկ");

// cc.display(function(c) {
//    return !c.toString().match(/[Ա-Ֆ]/gi);
// });


var x = "Հա’յկ";
cc.init();
var y = cc.correct(x);

console.log(x);
console.log(y);

// if ( cc.correct(x) === x ) {
//    console.log("BAD");
// }

}());