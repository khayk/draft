(function() {


    // identify tags that can be ignored
    function supportedTag(tag) {
        var coreTags = /add|wj|nd/g;
        return (tag.match(coreTags) !== null);
    }

    function skipTag(re, str, skipTo) {
        var arr = null;
        while (true) {
            arr = re.exec(str);
            if (arr === null) {
                throw 'not expected to encounter the end at this point';
            }
            if (arr[1] == skipTo)
                return;
        }
    }

    function findClosingTag(re, arr, str, what) {
        while (true) {
            arr = re.exec(str);
            if (arr === null) {
                throw 'not expected to encounter the end at this point';
            }
            if (arr[1] == what) {
                console.log('pair found: ', arr[1]);
                return arr;
            }
        }

    }

    var Verse = function(str) {
        var re = /(\\\+?(\w+)\*?)\s?/gm;
        var arr = null;
        var start = 0;

        while ((arr = re.exec(str)) !== null) {
            if (arr.index > start) {
                console.log('text found:', str.substring(start, arr.index));
            }

            if (!supportedTag(arr[2])) {
                /// skip to tag
                //console.log('tag will be skipped : ', arr[1]);
                arr = findClosingTag(re, arr, str, arr[1] + '*');
                start = arr.index + arr[0].length;
            }

            start = arr.index + arr[0].length;

            // var sub = str.substring(start);
            // this.Verse(sub);
        }

        console.log('tailing text: ', str.substring(start, str.length));
        this.text = str;
        this.tags = [];
    };

    // var text = '\\zw \\+zws H07225 \\+zws*\\zw*In the beginning\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*God\\zx \\zx* \n' +
    //     '\\zw \\+zws H0853 H01254 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*created\\zx \\zx* \n' +
    //     '\\zw \\+zws H08064 \\+zws*\\zw*the heaven\\zx \\zx* \\zw \\+zws H0853 \\+zws*\\zw*and\\zx \\zx* \n' +
    //     '\\zw \\+zws H0776 \\+zws*\\zw*the earth\\zx \\zx*.';

    var text = '\\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*' +
        '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and' +
        'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*' +
        '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the' +
        'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of' +
        'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*' +
        '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the' +
        'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.';

    var test = '\\zw \\zw*\\add hello \\nd to \\wj developer\\wj*\\nd*\\add* some other text';
    var v = new Verse(test);
    //console.log(tmp);
    //console.log(v.tex);
    //console.log(canIgnore('\\ww'));
}());

// var moduleBible = require('./lib-modules/bible.js');

// var Verse   = moduleBible.Verse;
// var Chapter = moduleBible.Chapter;

// //var verse = new moduleBible.Verse();

// var v = new Verse();
// v.render();

// var c = new Chapter();
// c.render();



//var fs   = require('fs');
// var path = require('path');
// var winston = require('winston');

/*
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
*/



//var x = bib.types.Bible('aaa');
//var c = new Chapter();

//console.log(c.number);

// walk('d:/projects/draft/savebible/attempt2/արևելահայերեն/', function(err, results) {
//    if (err) throw err;
//    //console.log(results);
//    results.forEach(fix_files);

//    cc.display(function(c) {
//       return !c.toString().match(/[Ա-Ֆ]/gi);
//    });
// });