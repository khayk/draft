var http    = require('http');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var winston = require('winston');
//var sleep   = require('sleep');

var logger = new (winston.Logger)({
   transports: [
      new (winston.transports.Console)({colorize: true}),
      new (winston.transports.File)({ filename: 'draft.log', json: false })
   ]
});

function pad(n, width, z) {
   z = z || '0';
   n = n + '';
   return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

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
      data = fs.readFileSync(url, {encoding:'utf8'});
      callback(null, data);
   }
   catch (e) {
      callback(e);
   }
}


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

// 2 bibles with testaments
var bibles = [
   {
      name: 'ararat',
      tests: [
         {name: 'old', id: 1},
         {name: 'new', id: 2}
      ]
   },

   {
      name: 'ejmiacin',
      tests: [
         {name: 'old', id: 3},
         {name: 'new', id: 4}
      ]
   }
];

var spacing = 0;
function print(text) {
   var x = pad('', spacing, ' ') + text;
   console.log(x);
}

function enterScope() {
   spacing += 3;
}

function leaveScope() {
   spacing -= 3;
}

bibles.forEach(function(item) {
   //console.log(JSON.stringify(item));
   enterScope();
   print(item.name + '/');

   item.tests.forEach(function(tst) {
      enterScope();
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
            enterScope();
            extractOptions(loc, data, onBookAvailable);
            leaveScope();
         })
      })

      leaveScope();
   })
   leaveScope();
})
*/

function onBookAvailable(err, chaps) {
   if (err)
      throw err;

   chaps.forEach(function(chap) {
      enterScope();

      var url = fnBooks + chap.id;
      print(url);

      leaveScope();
   });
}



(function() {


   // extract options from the specified string
   function extractOptions(str, callback) {
      var re = /<(option)\s+value="(\d+)">([\s\S]+?)<\/\1>/gm;
      var order = 1;
      var options = [];
      while ((arr = re.exec(str)) !== null) {
         options.push({'order': order, 'id': arr[2], 'name': arr[3].trim()});
         ++order;
      }

      callback(null, options);
   }



   // convert book name to a global name
   function bookNameToGlobalID(name) {
    return name;
   }


   function Testament(name, type, id, subid) {
       this.name  = name,
       this.type  = type,
       this.id    = id,
       this.subid = subid,
       this.books = []
   }


   function Book(name, id, number) {
       this.test     = null,
       this.name     = name,
       this.id       = id,
       this.number   = number,
       this.chapters = []
   }


   function Chapter(name, id, number) {
       this.book    = null,
       this.name    = name,
       this.id      = id,
       this.number  = number,
       this.content = ''
   }

   var QUERY       = 'http://www.biblesociety.am/scripts/bibles/func.php?func=';
   var CONTENT     = 'http://www.biblesociety.am/main.php?lang=a&content=bible&page-id=8&';

   var TESTMNT_ID  = 'testament_id';
   var DROP_VAR    = 'drop_var';
   var SUB_PAGE_ID = 'subpage-id';    // (ararat 1, ejmiacin 2)
   var BOOK_ID     = 'book_id';
   var CHAP_ID     = 'chapter_id';

   // old books:       func=testament_id&drop_var=1
   // book chapters:   func=book_id&drop_var=91
   // xevtakan 4 cont: subpage-id=2&testament_id=3&book_id=91&chapter_id=1766


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
      var qstr = buildQuery(QUERY,
                            [
                            {name: TESTMNT_ID, val: null},
                            {name: DROP_VAR,   val: testament.id}
                            ]);

      getContent(qstr, function(err, str) {  /// query available books
         if (err) {
            logger.error('Query failed: ' + qstr);
            return;
         }

         logger.info('started testament processing: ', testament.name);
         logger.info(qstr);

         extractOptions(str, function(err, opts) {  /// options extracted
            if (err) {  /// deal with error
               logger.error('Failed to extract options from data: ', str);
               return;
            }

            /// process each entry
            opts.forEach(function(opt, i) {
               if (i > 2 )
                  return;
               var book  = new Book(opt.name, opt.id, globalOrderNumber + opt.order);
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
      var qstr = buildQuery(QUERY,
                            [
                            {name: BOOK_ID,  val: null},
                            {name: DROP_VAR, val: book.id}
                            ]);



      getContent(qstr, function(err, str) {  /// query available books
         if (err) {
            logger.error('Query failed: ' + qstr);
            return;
         }

         var sn = pad(book.number, 2) + '-' + book.name;
         logger.info('started book processing: ', sn);
         logger.info(qstr);

         extractOptions(str, function(err, opts) {  /// options extracted
            if (err) {  /// deal with error
               logger.error('Failed to extract options from data: ', str);
               return;
            }

            /// process each entry
            opts.forEach(function(opt, i) {
               if (i > 2 )
                 return;
               var chap  = new Chapter(opt.name, opt.id, opt.order);
               chap.book = book;
               book.chapters.push(chap); /// become a chapter of current book
               queryContent(chap);
            });
         });

         logger.info('completed book processing: ', sn);
      });

   }


   function queryContent(chapter) {
      var qstr = buildQuery(CONTENT,
                            [
                            {name: SUB_PAGE_ID, val: chapter.book.test.subid},
                            {name: TESTMNT_ID,  val: chapter.book.test.id},
                            {name: BOOK_ID,     val: chapter.book.id},
                            {name: CHAP_ID,     val: chapter.id}
                            ]);
      //logger.info(qstr);

/*      // data will be in a utf8 format
      getContent(qstr, function(err, str) {
         if (err) {
            logger.error('Failed to download content at : ' + qstr);
            return;
         }

         var parent = chapter.book.test.name + '/' +
         chapter.book.test.type + '/' +
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
      });*/
   }


   function main() {
      var tsts = [];

      // tsts.push(new Testament('Ararat',   'old', 1, 1));
      // tsts.push(new Testament('Ararat',   'new', 2, 1));
      tsts.push(new Testament('Ejmiacin', 'old', 3, 2));
      tsts.push(new Testament('Ejmiacin', 'new', 4, 2));

      tsts.forEach(function(t) {
         queryBooks(t);
      });
   }

   main();

})();
