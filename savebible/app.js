var http    = require('http');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var winston = require('winston');
//var sleep = require('sleep');

var cfg = {
   dataRoot:    'd:/projects/mygithub/web-bible/data/',
   mappingFile: 'id-mapping.json',
   environment: 'test',
   encoding:    'utf8'
};

var logger = new(winston.Logger)({
   transports: [
      new(winston.transports.Console)({
         colorize: true
      }),
      new(winston.transports.File)({
         filename: 'draft.log',
         json: false
      })
   ]
});

function pad(n, width, z) {
   z = z || '0';
   n = n + '';
   return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function QueryHolder() {
   this.fc = {};

   this.add = function(key, content, fn) {
      var ref = this.fc[key];
      if (ref) {
         logger.warn('the query with key: ' + key + ' is already exists.');
         return;
      }
      this.fc[key] = {
         content: content,
         fn: fn
      };
   };

   this.find = function(key) {
      var ref = this.fc[key];
      if (ref) {
         return true;
      }
      return false;
   };

   this.repeat = function() {
      logger.info('repeating problematic queries...');
      for (var key in this.fc) {
         var ref = this.fc[key];
         logger.info(key, ref.content);
         ref.fn(ref.content);
      }
   };
}

var qh = new QueryHolder();

logger.info(pad('APPLICATION STARTED', 45, ' '));

// download the content of the specified url and fire callback when done
function getContent(url, callback) {

   http.get(url, function(res) {
      var content = '';
      res.setEncoding('utf8');

      res.on('data', function(data) {
         content += data;
      });

      res.on('end', function() {
         callback(null, content);
      });

   }).on('error', function(err) {
      callback(err);
   });
}


function getContentSimulate(url, callback) {
   //print('reading file: ' + url);
   url = 'D:/projects/draft/savebible/templates/Ejmiacin - Xevtakan 4';
   var data;
   try {
      data = fs.readFileSync(url, {
         encoding: 'utf8'
      });
      callback(null, data);
   } catch (e) {
      callback(e);
   }
}


function BBMRecord(id, index, abbr, type) {
   this.id       = id;     // book unique id
   this.index    = index;  // book order number
   this.abbr     = abbr;
   this.type     = type;   // 1 - old, 2 - new, 3 - additional
}

// books base mapping
function BBM () {
   this.records = [];
   this.recById = {};
   this.recByOn = {};
}


BBM.prototype = {
   initialize: function(options) {
      var file    = options.dataRoot + options.mappingFile;
      var thisRef = this;

      var data = fs.readFileSync(file, options.encoding);
      var js = JSON.parse(data);
      js.forEach(function(x) {
         var obj = new BBMRecord(x.id, x.index, x.abbr, x.type);
         thisRef.records.push(obj);
         thisRef.recById[obj.id]    = thisRef.records.length - 1;
         thisRef.recByOn[obj.index] = thisRef.records.length - 1;
      });
   },

   recordById: function(id) {
      return this.records[this.recById[id]];
   },

   recordByOn: function(on) {
      return this.records[this.recByOn[on]];
   }
};


/*
function statistics() {
   var attrs = {};

   return {
      discover: function(attr, cnt) {
         if (attrs[attr]) {
            attrs[attr].count += count;
         }
         else {
            attrs[attr] = {count: cnt, handled: 0};
         }
      },

      handle: function(attr, cnt) {
         if (attrs[attr]) {
            attrs[attr].handled += count;
         }
         else {
            attrs[attr] = {count: 0, handled: cnt};
         }
      },

      numDiscovered: function(attr) {
         return attrs[attr].count;
      },

      numHandled: function(attr) {
         return attrs[attr].handled;
      }
   };
}
*/
/*


   // function test() {
   //    fs.readFile('invest-ejmiacin.html', {encoding:'utf8'}, function(err, data) {
   //       if (err) {
   //          logger.error("Failed to read file.");
   //          return;
   //       }

   //       extractOptions(data, function(err, opts) {
   //          logger.info(opts);
   //       });
   //    });
   // }

   // test();

bibles.forEach(function(item) {
   //console.log(JSON.stringify(item));
   print(item.name + '/');

   item.tests.forEach(function(tst) {
      print(tst.name + '/');

      var loc = item.name + '/' + tst.name + '/';
      mkdirp(loc, function(err) {
         if (err)
            throw err;

         var url = fnTestament + tst.id;
         getContentSimulate(url, function(err, data) {
            if (err) {
               print(err);
               return;
            }
            extractOptions(loc, data, onBookAvailable);
         })
      })
   })
})
*/

(function() {


   // extract options from the specified string
   function extractOptions(str, callback) {
      var re = /<(option)\s+value="(\d+)">([\s\S]+?)<\/\1>/gm;
      var order = 1;
      var options = [];
      while ((arr = re.exec(str)) !== null) {
         options.push({
            'order': order,
            'id': arr[2],
            'name': arr[3].trim()
         });
         ++order;
      }

      callback(null, options);
   }

   // convert book name to id
   function bookNameToID(name) {
      return name;
   }

   var NM = (function() {
      var instance_; // instance stores a reference to the Singleton

      function init() {
         var namesMap = {};

         return {
            load: function(file) {
               data = fs.readFileSync(file, {
                  encoding: 'utf8'
               });

               var lines = data.split('\n');
               lines.forEach(function(s, i) {
                  var parts = s.split('|');
                  var key   = parts[0].trim();
                  var val   = parts[1].trim();

                  var ref = namesMap[key];
                  if (ref && ref !== val) {
                     logger.warn(key + ' is already exists');
                     logger.warn(ref + ' is overwritten with ' + val);
                  }
                  namesMap[key] = val;
                  //logger.info(key, ' -> ',  val);
               });
            },

            nameToId: function(key) {
               var ref = namesMap[key];
               if (ref)
                  return ref;
               logger.error(key + ' does not exists.');
               return 'ZZZ';
            }
         };
      }

      return {
         instance: function() {
            if (!instance_) {
               instance_ = init();
            }
            return instance_;
         }
      };
   })();


   function Testament(name, type, id, subid) {
      this.name = name;
      this.type = type;
      this.id = id;
      this.subid = subid;
      this.books = [];
   }


   function Book(name, id, number) {
      this.test = null;
      this.name = name;
      this.id = id;
      this.number = number;
      this.chapters = [];
   }


   function Chapter(name, id, number) {
      this.book = null;
      this.name = name;
      this.id = id;
      this.number = number;
      this.content = '';
      this.verses = [];
   }

   function Verse(text, number) {
      this.chapter = null;
      this.text    = text;
      this.number  = number;
   }

   var QUERY   = 'http://www.biblesociety.am/scripts/bibles/func.php?func=';
   var CONTENT = 'http://www.biblesociety.am/main.php?lang=a&content=bible&page-id=8&';

   var TESTMNT_ID  = 'testament_id';
   var DROP_VAR    = 'drop_var';
   var SUB_PAGE_ID = 'subpage-id'; // (ararat 1, ejmiacin 2)
   var BOOK_ID     = 'book_id';
   var CHAP_ID     = 'chapter_id';

   function buildQuery(base, fields) {
      var res = base;
      fields.forEach(function(f, i) {
         if (i > 0)
            res += '&';

         res += f.name;
         if (f.val) {
            res += ('=' + f.val);
         }
      });
      return res;
   }


   var globalOrderNumber = 0;

   function queryBooks(testament) {
      var qstr = buildQuery(QUERY, [{
         name: TESTMNT_ID,
         val: null
      }, {
         name: DROP_VAR,
         val: testament.id
      }]);

      getContent(qstr, function(err, str) { /// query available books
         if (err) {
            logger.error('Query failed: ' + qstr);
            return;
         }

         logger.info('started testament processing: ', testament.name);
         logger.info(qstr);

         extractOptions(str, function(err, opts) { /// options extracted
            if (err) { /// deal with error
               logger.error('Failed to extract options from data: ', str);
               return;
            }

            /// process each entry
            opts.forEach(function(opt, i) {
               // if (i > 2)
               //    return;
               var nameId = NM.instance().nameToId(opt.name);
               var book = new Book(nameId, opt.id, globalOrderNumber + opt.order);
               book.test = testament;
               testament.books.push(book);
               queryChapters(book);
            });

            globalOrderNumber = globalOrderNumber + opts.length;
         });

         logger.info('completed testament processing: ', testament.name);
      });
   }

   function queryChapters(book) {
      var qstr = buildQuery(QUERY, [{
         name: BOOK_ID,
         val: null
      }, {
         name: DROP_VAR,
         val: book.id
      }]);

      getContent(qstr, function(err, str) { /// query available books
         if (err) {
            logger.error('Query failed: ' + qstr);
            qh.add(qstr, book, queryChapters);
            return;
         }

         var sn = pad(book.number, 2) + '-' + book.name;
         logger.info('started book processing: ', sn);
         logger.info(qstr);

         extractOptions(str, function(err, opts) { /// options extracted
            if (err) { /// deal with error
               logger.error('Failed to extract options from data: ', str);
               return;
            }

            /// process each entry
            opts.forEach(function(opt, i) {
               // if (i > 2)
               //    return;
               var chap = new Chapter(opt.name, opt.id, opt.order);
               chap.book = book;
               book.chapters.push(chap); /// become a chapter of current book
               queryContent(chap);
            });
         });

         logger.info('completed book processing: ', sn);
      });
   }


   function queryContent(chapter) {
      var qstr = buildQuery(CONTENT, [{
         name: SUB_PAGE_ID,
         val: chapter.book.test.subid
      }, {
         name: TESTMNT_ID,
         val: chapter.book.test.id
      }, {
         name: BOOK_ID,
         val: chapter.book.id
      }, {
         name: CHAP_ID,
         val: chapter.id
      }]);

      //logger.info(qstr);

      // data will be in a utf8 format
      getContent(qstr, function(err, str) {
         if (err) {
            if (!qh.find(qstr)) {
               logger.warn('Failed to download content at: ' + qstr);
               // repeat failed query one more time
               qh.add(qstr, chapter, queryContent);
               logger.info('One more attempt');
               queryContent(chapter);
            }
            else {
               logger.error('Failed to download content at: ' + qstr);
            }
            return;
         }

         var parent = chapter.book.test.name + '/' +
                      chapter.book.test.type + '/' +
                      pad(bbm.recordById(chapter.book.name).index, 2) + '-' +
                      chapter.book.name + '/';

         mkdirp(parent, function(err) {
            if (err) {
               logger.error('Failed to create directory: ', parent, ', err: ' + err);
               return;
            }

            var path = parent + pad(chapter.number, 2) + '.html';
            var re = /(<hr size="1" style="clear:both" \/>)([\s\S]+)(<hr size="1" \/>)/gm;

            /// find the needed chunk
            if ((arr = re.exec(str)) !== null) {
               fs.writeFile(path, arr[2], function(err) {
                  if (err) {
                     logger.error('failed to write file: ', path, ', err: ', err);
                  } else {
                     logger.info('saved to file: ', path);
                  }
               });
            }
         });
      });
   }

   function downloadBibles() {
      NM.instance().load('templates/Ararat Books');
      NM.instance().load('templates/Ejmiacin Books');

      var tsts = [];
      tsts.push(new Testament('Ararat',   'old', 1, 1));
      tsts.push(new Testament('Ararat',   'new', 2, 1));
      // tsts.push(new Testament('Ejmiacin', 'old', 3, 2));
      // tsts.push(new Testament('Ejmiacin', 'new', 4, 2));

      tsts.forEach(function(t) {
         queryBooks(t);
      });
   }

   function readDirFiles(root, callback) {

      var exts = extensions.split(';');
      // enumerate files in a given directory
      fs.readdir(dataDir, function(err, files) {
         if (err) {
            callback(err, bible);
            return;
         }

         files.forEach(function(p) {
            var e = path.extname(p);
            if (path.extname(p) === '.usfm') {
               callback(null, p);
            }
         });
      });
   }

   // ---------------------------------------------------------------
   function buildUSFM(file) {
      var dataDir = dataRoot;

      // enumerate files in a given directory
      fs.readdir(dataDir, function(err, files) {
         var bible = new Bible();

         if (err) {
            callback(err, bible);
            return;
         }

         files.forEach(function(p) {
            if (path.extname(p) === '.usfm') {
               callback(null, )
            }
         });

         callback(null, bible);
      });
   }

   function testObj(val) {
      this.val = val;
   }

   function testFunction(obj) {
      console.log(obj.val);
   }

   function main() {
      bbm = new BBM();
      bbm.initialize(cfg);

      //downloadBibles();
   }

   main();
})();