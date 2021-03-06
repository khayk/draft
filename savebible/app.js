var http    = require('http');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var winston = require('winston');
var path    = require('path');

//var sleep = require('sleep');

//var personal = 'c:/Dev/code/projects/personal/';  // LENOVO
//var personal = 'd:/projects/';                    // DELL
//var personal = 'd:/projects/';                    // WORK

var cfg = {
  // 'c:/Dev/code/projects/personal/';  // LENOVO
  // 'd:/projects/';                    // DELL
  personal: 'd:/projects/', // WORK
  dataRoot: '',
  mappingFile: 'id-mapping.json',
  environment: 'test',
  encoding: 'utf8'
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


function CharacterCollector() {
  this.chars = {};
  this.rm = {};

  this.init = function() {
    this.rm[String.fromCharCode(parseInt("2019", 16))] = String.fromCharCode(parseInt("55A", 16));
    this.rm[String.fromCharCode(parseInt("201c", 16))] = String.fromCharCode(parseInt("ab", 16));
    this.rm[String.fromCharCode(parseInt("201d", 16))] = String.fromCharCode(parseInt("bb", 16));
    this.rm[String.fromCharCode(parseInt("3A", 16))] = String.fromCharCode(parseInt("589", 16));
  };

  this.collect = function(str) {
    for (var i = 0; i < str.length; ++i)
      this.chars[str[i]] = str.charCodeAt(i).toString(16);
  };

  this.fix = function(str) {
    var cpy = [];
    for (var i = 0; i < str.length; ++i) {
      cpy[i] = str[i];
      for (var key in this.rm) {
        if (str[i] === key) {
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
      } else {
        logger.info(key + " -> ", this.chars[key]);
      }
    }
  };
}


var cc = new CharacterCollector();
cc.init();

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
  this.id = id; // book unique id
  this.index = index; // book order number
  this.abbr = abbr;
  this.type = type; // 1 - old, 2 - new, 3 - additional
}

// books base mapping
function BBM() {
  this.records = [];
  this.recById = {};
  this.recByOn = {};
}


BBM.prototype = {
  initialize: function(options) {
    var file = options.dataRoot + options.mappingFile;
    var thisRef = this;

    var data = fs.readFileSync(file, options.encoding);
    var js = JSON.parse(data);
    js.forEach(function(x) {
      var obj = new BBMRecord(x.id, x.index, x.abbr, x.type);
      thisRef.records.push(obj);
      thisRef.recById[obj.id] = thisRef.records.length - 1;
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

  function fwrite(file, data) {
    fs.writeFile(file, data, function(err) {
      if (err) {
        logger.error('failed to write file: ', file, ', err: ', err);
      } else {
        logger.info('saved to file: ', file);
      }
    });
  }

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
            var key = parts[0].trim();
            var val = parts[1].trim();

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

  var options = function() {
    this.view = 'test'; // 'usfm', 'single'
  };

  function Testament(name, type, id, subid) {
    this.name = name;
    this.type = type;
    this.id = id;
    this.subid = subid;
    this.books = [];
  }

  Testament.prototype = {
    render: function(opt) {
      var output = '';
      this.books.forEach(function(b) {
        output += b.render(opt) + '\n';
      });
      return output;
    }
  };


  function Book(name, id, number) {
    this.test = null;
    this.name = name;
    this.id = id;
    this.number = number;
    this.chapters = [];
  }

  Book.prototype = {
    render: function(opt) {
      var output = '';

      if (opt.view === 'test') {
        if (this.chapters.length > 0) {
          if (this.chapters[0].titles.length > 0) {
            //output += this.chapters[0].titles[0].tt + '\n\n\n';
            output += this.name + '\n\n\n';
          }
        }
      }

      if (opt.view === 'usfm') {
        output += '\\id ' + this.id + '\n';
        output += '\\mt ' + this.name + '\n';
      }

      this.chapters.forEach(function(c) {
        output += c.render(opt);
      });
      return output;
    }
  };

  function Chapter(name, id, number) {
    this.book = null;
    this.name = name;
    this.id = id;
    this.number = number;
    this.content = '';
    this.verses = [];
    this.titles = [];
  }

  Chapter.prototype = {
    render: function(opt) {
      output = '';

      if (opt.view === 'test') {
        output = this.number + ' ';
        this.verses.forEach(function(v, i) {
          if (i > 0)
            output += ' ' + v.number;
          output += v.text;
        });
        output += '\n';
      } else if (opt.view === 'single') {
        this.verses.forEach(function(v, i) {
          output += v.chapter.book.id + ' ' + v.chapter.number + ':' + v.number + ' ';
          output += v.text + '\n';
          //output += v.text + ' ';
        });
      } else if (opt.view === 'usfm') {
        output += '\\c ' + this.number + '\n';
        this.verses.forEach(function(v, i) {
          output += '\\v' + ' ' + v.number + ' ';
          output += v.text + '\n';
        });
      }
      return output;
    }
  };

  function Verse(text, number) {
    this.chapter = null;
    this.text = text;
    this.number = number;
  }

  var QUERY = 'http://www.biblesociety.am/scripts/bibles/func.php?func=';
  var CONTENT = 'http://www.biblesociety.am/main.php?lang=a&content=bible&page-id=8&';

  var TESTMNT_ID = 'testament_id';
  var DROP_VAR = 'drop_var';
  var SUB_PAGE_ID = 'subpage-id'; // (ararat 1, ejmiacin 2)
  var BOOK_ID = 'book_id';
  var CHAP_ID = 'chapter_id';

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
        } else {
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
          fwrite(path, arr[2]);
        }
      });
    });
  }

  function downloadBibles() {
    NM.instance().load('templates/Ararat Books');
    NM.instance().load('templates/Ejmiacin Books');

    var tsts = [];
    tsts.push(new Testament('Ararat', 'old', 1, 1));
    tsts.push(new Testament('Ararat', 'new', 2, 1));
    // tsts.push(new Testament('Ejmiacin', 'old', 3, 2));
    // tsts.push(new Testament('Ejmiacin', 'new', 4, 2));

    tsts.forEach(function(t) {
      queryBooks(t);
    });
  }


  function getDirectories(dir) {
    return fs.readdirSync(dir).filter(function(entry) {
      return fs.statSync(dir + '/' + entry).isDirectory();
    });
  }

  function buildUSFM(file, tst) {
    options.view = 'usfm';
    // var data = tst.render(options);
    // fwrite(file + '.usfm', data);
    tst.books.forEach(function(b) {
      //output += b.render(opt) + '\n';
      if (b.id)
        fwrite(file + b.number + '-' + b.id + '.usfm', b.render(options));
    });
  }

  function testObj(val) {
    this.val = val;
  }

  function testFunction(obj) {
    console.log(obj.val);
  }

  function createTextBook(root, tname, ttype, book) {

  }

  function isUpperCase(str) {
    var ucount = 0;
    var arr = str.split('');
    arr.forEach(function(ch) {
      if (ch == ch.toUpperCase())
        ++ucount;
    });
    if (str.length - ucount <= 2)
      return true;
    return false;
  }

  function replacer(match, offset, string) {
    return match.toLowerCase();
  }

  function extractChapter(chap, str) {

    /// select all available paragraphs
    var re = /<p>([\s\S]+?)<\/p>/gm;
    var arr;

    var collector = '';
    var verseNumber = 1;
    while ((arr = re.exec(str)) !== null) {
      var text = arr[1];

      // remove all html tag
      var input = text.replace(/<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/igm, "");
      if (input.match(/[Ա-Ֆ]+\.?\s?\d+(\.|,|-)/igm) !== null)
        continue;

      var regex = /(\d+)?(\D+)/gm;
      var matches, found = false;
      while ((matches = regex.exec(input)) !== null) {
        var tmp = matches[2].trim();
        if (isUpperCase(tmp))
          continue;

        found = true;
        var verseTxt = matches[2].trim();

        /// collect characters
        //cc.collect(txt);
        verseTxt = cc.fix(verseTxt);
        verseTxt = verseTxt.replace("»»", "»");
        //verseTxt = verseTxt.replace(/\.\s[Ա-Ֆ]/gm, replacer);

        var verseNum = null;
        if (matches[1]) {
          verseNum = matches[1].trim();
        }

        if (verseNum === null) {
          if (verseNumber > 1) {
            chap.verses[verseNumber - 2].text += ' ' + verseTxt;
            continue;
          }
        }

        var verse = new Verse(verseTxt, verseNumber);
        verse.chapter = chap;
        chap.verses.push(verse);
        ++verseNumber;
      }

      if (found === false) {
        //logger.info("Title: ", input);
        chap.titles.push({
          vn: verseNumber,
          tt: input
        });
      }
    }
  }

  function processDownloaded() {
    var tname = 'Ejmiacin';
    var ttype = 'new';
    var oname = '';
    var rootDir = cfg.personal + 'draft/savebible/attempt3/' + tname + '/' + ttype + '/';

    var dirs = getDirectories(rootDir);
    //var dirs = [];
    //dirs.push('49-MAT');

    var bible = new Testament(tname, ttype, 0, 0);
    dirs.forEach(function(d) {
      console.log(d);
      var curDir = rootDir + d;

      /// book order number and id
      var tmp = d.split('-');
      var book = new Book('', tmp[1], tmp[0]);

      files = fs.readdirSync(curDir);

      var htmls = files.filter(function(item) {
        return path.extname(item) === '.html';
      });

      /// insert book into bible
      bible.books.push(book);

      h = htmls[0];
      htmls.forEach(function(h) {
        //console.log(h);
        var str = fs.readFileSync(curDir + '/' + h);
        var re = /<h4>(.*)<\/h4>[\s\S]+<h2>(ԳԼ.\s(\d+))<\/h2>[\s\S]+?<p>([\s\S]+)<\/p>/gm;
        var arr;
        if ((arr = re.exec(str)) !== null) {
          logger.info(arr[1], arr[2]);

          book.name = arr[1].split('|')[1].trim();
          var chap = new Chapter('', arr[3], arr[3]);
          chap.book = book;
          extractChapter(chap, arr[4]);
          book.chapters.push(chap);
        } else {
          logger.error('Regexp match failed on chapter: ', d + ' ' + h);
        }
      });

      var fpath = curDir + '.txt';

      fpath = fpath.replace("\\", "/");
      var x = fpath.split("/");
      x.splice(x.length - 1, 0, "result");
      fpath = x.join("/");

      options.view = 'single';
      fwrite(fpath, book.render(options));

      cc.display(function(c) {
        return !c.toString().match(/[Ա-Ֆ]/gi);
      });
    });

    //buildUSFM(rootDir + oname, bible);
  }

  function main() {
    cfg.dataRoot = cfg.personal + 'mygithub/web-bible/data/';

    bbm = new BBM();
    bbm.initialize(cfg);

    processDownloaded();
    //downloadBibles();
  }

  main();
})();