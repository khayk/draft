(function() {

var fs   = require('fs');
var path = require('path');

function CharacterCollector() {
   this.chars = {};

   this.collect = function(str) {
      for (var i = 0; i < str.length; ++i)
         this.chars[str[i]] = parseInt(str.charCodeAt(i), 16);
   };

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

cc.collect("HAYK");
cc.collect("hayk");
cc.collect("Айк");
cc.collect("Հայկ");

cc.display(function(c) {
   return !c.toString().match(/[Ա-Ֆ]/gi);
});

}());