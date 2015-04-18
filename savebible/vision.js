var _              = require('underscore');
var bounds         = require('binary-search-bounds');


//var arr = [1, 1, 1, 4, 5, 6, 6, 10];
var arr = [];
for (var i = 0 ; i < 100000000; ++i)
  arr.push(i);

var val = 5, lb = 0, ub = 0;

console.log('start lookup...');
for (var j = 0; j < 10000000; ++j) {
  lb = bounds.ge(arr, val);
  ub = bounds.le(arr, val);
}
console.log('end lookup...');

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

// SearchResultManager = refList;







// langTest();

// _.each(src, function(value, key) {
//   var pureWord = Lexical.removePunctuations('en', key);
//   pureWord.split(' ').forEach(function(e) {
//     dict.addWord(e, value);
//   });
// });

// dict.optimize();

// console.log(dict.getWords());
// console.log(dict.getRefs('A'));
// console.log(dict.getRefs('kikos'));
// console.log('words: %d', dict.getWordsCount());

//launchStressTest();
//agent.start();

//renderTest();
//packMgr.discover('./data/test/', onDiscovered);



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
function onDiscovered(err, packs) {
  if (err) {
    console.error(err);
    return;
  }

  // all packages are discovered at this point
  packMgr.display();

  var lid = 'en';
  var abbr = 'tkjv';
  var pack = core.PackManager.getPackage(lid, abbr);
  if (pack === null) {
    console.warn('package [%s, %s] not found', lid, abbr);
    return;
  }

  var bible = core.Loader.loadBible(pack);

  // var renderer = new USFMRenderer();
  // console.log(bible.render(renderer));
}