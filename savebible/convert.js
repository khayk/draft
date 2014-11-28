(function() {

var fs   = require('fs');
var path = require('path');
var winston = require('winston');

var logger = new(winston.Logger)({
   transports: [
      new(winston.transports.Console)({
         colorize: true
      }),
      new(winston.transports.File)({
         filename: 'convert.log',
         json: false
      })
   ]
});

function CharacterCollector() {
   this.chars = {};
   this.rm = {};

   this.init = function() {
      this.rm[String.fromCharCode(parseInt("55A", 16))] = String.fromCharCode(parseInt("55B", 16));
   };

   this.collect = function(str) {
      for (var i = 0; i < str.length; ++i)
         this.chars[str[i]] = str.charCodeAt(i).toString(16); //parseInt(str.charCodeAt(i), 16);
   };

   this.fix = function(str) {
      var cpy = [];
      for (var i = 0; i < str.length; ++i) {
         cpy[i] = str[i];
         for (var key in this.rm) {
            if ( str[i] === key ) {
               cpy[i] = this.rm[key];
               break;
            }
         }
      }
      return cpy.join('');
   };

   this.display = function(filter) {
      for (var key in this.chars) {
         if (filter) {
            if (filter(key))
               logger.info(key + " -> ", this.chars[key]);
         }
         else {
            logger.info(key + " -> ", this.chars[key]);
         }
      }
   };
}

var cc = new CharacterCollector();


var walk = function(dir, done) {
   var results = [];
   fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var pending = list.length;
      if (!pending) return done(null, results);
      list.forEach(function(file) {
         file = dir + '/' + file;
         fs.stat(file, function(err, stat) {
            if (stat && stat.isDirectory()) {
               walk(file, function(err, res) {
                  results = results.concat(res);
                  if (!--pending) done(null, results);
               });
            } else {
               results.push(file);
               if (!--pending) done(null, results);
            }
         });
      });
   });
};

function fix_files(file) {
   console.log(file);

   data = fs.readFileSync(file, {
      encoding: 'utf8'
   });
   //cc.collect(data);
   data = cc.fix(data);

   fs.writeFile(file, data, function(err) {
      if (err) {
         logger.error('failed to write file: ', file, ', err: ', err);
      } else {
         logger.info('saved to file: ', file);
      }
   });
}

// walk('d:/projects/draft/savebible/attempt2/արևելահայերեն/', function(err, results) {
//    if (err) throw err;
//    //console.log(results);
//    results.forEach(fix_files);

//    cc.display(function(c) {
//       return !c.toString().match(/[Ա-Ֆ]/gi);
//    });
// });

//var str = "d:/one/two/thee/some.txt";
//var str = "d:\\one\\two\\thee\\some.txt";

var re = /\.\s[A-Z]/gm;
var str = 'Letters O and W. Of the text will be replaced. With o and w';

function replacer(match, offset, string) {
  // p1 is nondigits, p2 digits, and p3 non-alphanumerics
  console.log('match:  ', match);
  console.log('offset: ', offset);
  console.log('string: ', string);
  return match.toLowerCase();
  //return 'a';//[match].join('').toLowerCase();
}

var output = str.replace(/\.\s[A-Z]/gm, replacer);

// var arr;
// while ((arr = re.exec(str)) !== null) {
//    var x = arr[0];
//    console.log('Match: ', arr[0]);
//    x.toLowerCase();
//    str.splice
//    //
// }

console.log(str);
console.log(output);

}());