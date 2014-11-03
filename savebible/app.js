var http = require('http');
var fs = require('fs');
var mkdirp = require('mkdirp');
//var sleep = require('sleep');

/*
var pageId = 8;
var subId  = 1;
var testId = 1;
var bookId = 6;
var chapId = 107;

function getFile(chap) {
   var url =   'http://www.biblesociety.am/main.php?lang=a' +
            '&content=bible&page-id=' + pageId +
            '&subpage-id=' + subId +
            '&testament_id=' + testId +
            '&book_id=' + bookId +
            '&chapter_id=' + chap;

   var file = fs.createWriteStream('gen_' + chap + '.html');
   var request = http.get(url, function(response) {
      response.pipe(file);
   });
}

for (var i = 107; i < 110; ++i) {
   getFile(i);
}
*/
/*
Ararat    (Old: 1, New: 2)
Ejmiacin  (Old: 3, New: 4)

select old testement  [http://www.biblesociety.am/scripts/bibles/func.php?func=testament_id&drop_var=1]
select new testement  [http://www.biblesociety.am/scripts/bibles/func.php?func=testament_id&drop_var=2]

 */

function pad(n, width, z) {
   z = z || '0';
   n = n + '';
   return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function extractOptions(loc, str, callback) {
   //text.replace(/<(option)\s+value="(\d+)">([Ա-Ֆ\s]+)<\/\1>/gm, "\n$3");
   var re = /<(option)\s+value="(\d+)">([\s\S]+?)<\/\1>/gm;
   ///<(option)\s+value="(\d+)">([Ա-Ֆ\s]+)<\/\1>/gm;

   //var matches = re.exec(text);
   var order = 1;

   var options = [];
   while ((arr = re.exec(str)) !== null) {
      var fnameonly = arr[3];
      fnameonly = fnameonly.trim();
      //console.log(fnameonly);

      var fname = loc + pad(order, 2) + ' - ' + fnameonly;
      var what = fs.writeFileSync(fname, fnameonly);
      var msg = order + '. ' + arr[0];
      //console.log(msg);
      ++order;

      options.push({'id': arr[2], 'name': arr[3]});
   }

   callback(null, options);
}
//   });


   //console.log(matches.length)
   //console.log(matches[2] + ' - ' + matches[3]);
   //console.log();
   //text.replace(/<(option)\s+value="(\d+)">([Ա-Ֆ\s]+)<\/\1>/gm, "\n$2 $3");
   //console.log(str.split('\n'))


function test() {
   fs.readFile('invest-ejmiacin.html', {encoding:'utf8'}, function(err, data) {
      if (err) {
         console.error("Failed to read file.");
         return;
      }
      extractOptions(data);
   })
}

var = fnChapter = 'http://www.biblesociety.am/main.php?testament_id=1&book_id=6&chapter_id=108&submit=%3E%3E&lang=a&content=bible&page-id=8&subpage-id=1'

var rootUrl = 'http://www.biblesociety.am/scripts/bibles/func.php?func=';
   var fnTestament = 'testament_id&drop_var=';
      var fnBooks     = 'book_id&drop_var=';



function getContentSimulate(url, callback) {
   enterScope();
   print('reading file: ' + url);

   var data;
   try {
      data = fs.readFileSync(url + '.html', {encoding:'utf8'});
      callback(null, data);
   }
   catch (e) {
      callback(e);
   }
   leaveScope();
}

// syncroniously download a single url and return result or error
function getContent(url, callback) {

   http.get(options, function(res) {
      var content = '';
      res.setEncoding('utf8');

      res.on('data', function(data) {
         content += data
      })

      res.on('end', function() {
         callback(null, content);
      })

   }).on('error', function(err) {
      callback(err);
   })
}

// 2 bibles with testaments
var bibles = [
   {
      name: 'ararat',
      tests: [
         {name: 'old', id: 1},
         {name: 'new', id: 2}
      ]
   }

/*   ,

   {
      name: 'ejmiacin',
      tests: [
         {name: 'old', id: 3},
         {name: 'new', id: 4}
      ]
   }*/
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

//test();