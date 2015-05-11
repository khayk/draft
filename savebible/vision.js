var _              = require('underscore');
var bounds         = require('binary-search-bounds');
var search         = require('./lib/search.js');
var helper         = require('./lib/helper.js');
var assert         = require('assert');

var HiResTimer     = helper.HiResTimer;
var timer          = new HiResTimer();
var algo = search.algo;


function stess(desc, a, b, cb) {
  var res = [];
  console.log('stressing...: %s', desc);
  timer.start();
  for (var i = 0; i < 10000; i++) {
    res = cb(a, b);
  }
  timer.stop();
  console.log('completed: %s', timer.str());
  console.log('result: ', res);
  console.log('\n\n');
  return res;
}

function sortNumber(a,b) {
    return a - b;
}

var a = [1, 2, 4, 6, 7, 8, 99];
var b = [3, 4, 5, 6, 7, 20, 24, 27];


var cases = [
  {a: [1, 2, 4, 6, 7, 8, 99], b: [3, 4, 5, 6, 7, 20, 24, 27]},
  {a: [],  b: []},
  {a: [1], b: []},
  {a: [],  b: [2]},
  {a: [1], b: [1]},
  {a: [2, 3], b: [1, 2, 3]},
  {a: [1, 2], b: []},
  {a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 17, 19, 20, 22, 25, 27, 30], b: [-1, 1, 2, 3, 4, 5, 6, 10, 30, 31, 99, 102]}
];

cases.forEach(function(elem) {
  var x = stess('intersectSortedUniqueArrays', elem.a, elem.b, algo.intersectSortedUniqueArrays);
  var y = stess('_.intersection', elem.a, elem.b, _.intersection);
  assert.deepEqual(x, y);

  x = stess('combineSortedUniqueArrays', elem.a, elem.b, algo.combineSortedUniqueArrays);
  y = stess('_.union', elem.a, elem.b, _.union);
  y.sort(sortNumber);
  assert.deepEqual(x, y);
});



return;




var arr = [1, 1, 1, 4, 5, 6, 6, 10];
var val = 11, lb = 0, ub = 0;

// lb = bounds.ge(arr, val);
// ub = bounds.le(arr, val);

console.log(arr);
console.log('ge: %d', bounds.ge(arr, val));
console.log('gt: %d', bounds.gt(arr, val));
console.log('lt: %d', bounds.lt(arr, val));
console.log('le: %d', bounds.le(arr, val));
console.log('eq: %d', bounds.eq(arr, val));

// console.log('lb: %d', lb);
// console.log('ub: %d', ub);
if (lb < 0)
  lb = 0;

var res = [];
for (var i = lb; i <= ub; ++i) {
  res.push(arr[i]);
}

console.log(res);
console.log('lb: %d', lb);
console.log('ub: %d', ub);

// console.log(lb);
// console.log(ub);




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
// function search(text, options) {}

// options {
//    wholeWord bool default=true
//    ignoreCase bool default=true
// }

// SearchResultManager = refList;



// function merge(left, right){
//     var result  = [],
//         il      = 0,
//         ir      = 0;

//     while (il < left.length && ir < right.length){
//         if (left[il] < right[ir]){
//             result.push(left[il++]);
//         } else {
//             result.push(right[ir++]);
//         }
//     }

//     return result.concat(left.slice(il)).concat(right.slice(ir));
// }
//
function sortNumber(a,b) {
    return a - b;
}

var x;
for (var i = 0; i < 1000000; i++) {
  x = merge(a, b);
  x.sort(sortNumber);
  x = _.unique(x, true);
}
console.log(x);
console.log(x.length);






//renderTest();
//packMgr.discover('./data/test/', onDiscovered);

  // function onDiscovered(err, packs) {
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }

  //   // all packages are discovered at this point
  //   core.PackManager.display();

  //   var lid = 'en';
  //   var abbr = 'tkjv';
  //   var pack = core.PackManager.getPackage(lid, abbr);
  //   if (pack === null) {
  //     console.warn('package [%s, %s] not found', lid, abbr);
  //     return;
  //   }

  //   var bible = core.Loader.loadBible(pack);
  //   var search = new BibleSearch();
  //   search.initialize(bible);

  //   var result = search.searchWord(word, opts);
  //   //console.log(result);
  //   search.expend(word, result);
  // }
  //


// var Smth = function(opts) {
//   // if (!options) {
//   //   options = { encoding: null, flag: 'r' };
//   // } else if (typeof options === 'string') {
//   //   options = { encoding: options, flag: 'r' };
//   // } else if (typeof options !== 'object') {
//   //   throw new TypeError('Bad arguments');
//   // }
//   this.t = opts.t || true;
// };
// var s1 = new Smth({});
// var s2 = new Smth({t: false});
// var s3 = new Smth({t: true});

// console.log(s1, s2, s3);
// var str  = fs.readFileSync('aaa', {encoding: 'utf8'});

/*

Bible {
    search(query, opt)  // returns an array of references, opt contains
}

TableOfContent {
  this.raw;

  getAll()
  getOne(id) // {}
}
 */

 // from convert.js
  function launchStressTest() {
    var dataRoot = dropboxDir + 'Private/projects/bible project/data/real/';
    var samples  = 1;

    function launchRenderTest(bible) {
      //var renderer = new USFMRenderer();
      var renderer = new TextRenderer({textOnly: false});
      console.log("RENDER STARTED...");
      timer.start();

      var data = '';
      bible.forEach(function(b) {
        for (var i = 0; i < samples; ++i) {
          data += b.render(renderer) + '\n';
        }
      });

      console.log("bible length: %d", data.length);
      timer.stop();
      timer.report();
      console.log("RENDER COMPLETED.");

      fs.writeFile('./data/raw/output.usfm', data);
    }

    var bible = [];
    var parser   = new USFMParser(false);

    fs.readdir(dataRoot, function(err, files) {
      if (err)
        throw err;

      console.log("PARSING STARTED...");
      timer.start();

      files.forEach(function(p) {
        if (path.extname(p) === '.usfm') {
          var str  = fs.readFileSync(dataRoot + p, {encoding: 'utf8'});
          var book = null;
          for (var i = 0; i < samples; ++i) {
            try {
              book = parser.parseBook(str);
              if ( BBM.instance().entryById(book.id).type !== 3)
                bible.push(book);
            }
            catch (e) {
              console.log(e);
            }
          }
        }
      });

      console.log(util.inspect(process.memoryUsage()));

      // var stats = new BibleStats();
      // bible.forEach(function(book) {
      //   stats.bookTags(book);
      // });
      // stats.report();

      timer.stop();
      timer.report();
      console.log("PARSING COMPLETED.");

      // _.each(BBM.instance().ids(), function(val, key) {
      //   var  found = false;
      //   bible.forEach(function(book) {
      //     if (book.id === key)
      //       found = true;
      //   });

      //   if (!found)
      //     console.log(key);
      // });

      launchRenderTest(bible);

      // bible = [];
      // parser = null;

      // setTimeout(function() {
      //   launchStressTest();
      // }, 1);
    });
  }


// USAGE: core.PackManager.scan('./data/test/', true, onDiscovered);