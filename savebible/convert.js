(function() {

  var DEV_STR = '';

  var GEN_1_2 = '\\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*' +
    '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and' +
    'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*' +
    '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the' +
    'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of' +
    'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*' +
    '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the' +
    'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.';

  var ROM_9_9 = '\\zw \\+zws G1063 \\+zws*\\+zwm robinson:CONJ 2 \\+zwm*\\zw*For\\zx \\zx*' +
    '\\zw \\+zws G3778 \\+zws*\\+zwm robinson:D-NSM 5 \\+zwm*\\zw*this\\zx \\zx*' +
    '\\add is\\add* \\zw \\+zws G3588 G3056 \\+zws*\\+zwm robinson:T-NSM robinson:N-NSM 3 4 \\+zwm*\\zw*the' +
    'word\\zx \\zx* \\zw \\+zws G1860 \\+zws*\\+zwm robinson:N-GSF 1 \\+zwm*\\zw*of' +
    'promise\\zx \\zx*, \\zw \\+zws G2596 \\+zws*\\+zwm robinson:PREP 6 \\+zwm*\\zw*At\\zx \\zx*' +
    '\\zw \\+zws G5126 \\+zws*\\+zwm robinson:D-ASM 9 \\+zwm*\\zw*this\\zx \\zx*' +
    '\\zw \\+zws G3588 G2540 \\+zws*\\+zwm robinson:T-ASM robinson:N-ASM 7 8 \\+zwm*\\zw*time\\zx \\zx*' +
    '\\zw \\+zws G2064 \\+zws*\\+zwm robinson:V-FDI-1S 10 \\+zwm*\\zw*will I' +
    'come\\zx \\zx*, \\zw \\+zws G2532 \\+zws*\\+zwm robinson:CONJ 11 \\+zwm*\\zw*and\\zx \\zx*' +
    '\\zw \\+zws G3588 G4564 \\+zws*\\+zwm robinson:T-DSF robinson:N-DSF 13 14 \\+zwm*\\zw*Sara\\zx \\zx*' +
    '\\zw \\+zws G2071 \\+zws*\\+zwm robinson:V-FXI-3S 12 \\+zwm*\\zw*shall' +
    'have\\zx \\zx* \\zw \\+zws G5207 \\+zws*\\+zwm robinson:N-NSM 15 \\+zwm*\\zw*a' +
    'son\\zx \\zx*.';

  var LUK_18_19 = 'And Jesus said unto him, \\wj  Why callest thou me good? none' +
    '\\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj* ';

  function extend(child, parent) {
    var fnObj = function() {};
    fnObj.prototype = parent.prototype;
    child.prototype = new fnObj();
    child.prototype.constructor = child;
    child.uber = parent.prototype;
  }

  // identify tags that can be ignored
  function supportedTag(tag) {
    var coreTags = /add|wj|nd/g;
    return (tag.match(coreTags) !== null);
  }

  function openingTag(str) {
    return str[str.length - 1] !== '*';
  }

  // HTML tag from USFM tag
  function htmlTag(tag) {

    // \qt  - Quoted text.
    //        Old Testament quotations in the New Testament, or other quotations.
    // \add - Translator's addition.
    // \wj  - Words of Jesus.
    // \nd  - Name of God (name of Deity).
    var coreTags = /add|wj|nd|qt/g;
    var mt = tag.match(coreTags);
    if (mt !== null)
      return mt;
    return 'unknown';
  }

  var NODE_TYPE_TEXT = 1;
  var NODE_TYPE_TAG  = 2;

  // options.renderMode  valid values
  var RENDER_TEXT = 1;
  var RENDER_HTML = 2;

  // bible view options
  var ViewOptions = function() {
    this.renderMode    = RENDER_HTML;
    this.font          = 'Trebuchet MS';
    this.paragraphMode = true;
  };

  var options = new ViewOptions();

  /// -----------------------------------------------------------------------
  ///                      NODE - THE BASE CLASS
  /// -----------------------------------------------------------------------
  var Node = function(parent, type) {
    this.parent = parent;
    this.type   = type;
  };

  Node.prototype.addChild = function(node) {
    throw 'addChild should be overriden in the derived class';
  };

  Node.prototype.toString = function() {
    throw 'toString should be overriden in the derived class';
  };

  Node.prototype.render = function(options) {
    throw 'render should be overriden in the derived class';
  };

  Node.prototype.type = function() {
    return this.type;
  };

  /// -----------------------------------------------------------------------
  ///                             TEXT NODE
  /// -----------------------------------------------------------------------
  var TextNode = function(text, parent) {
    Node.call(this, parent, NODE_TYPE_TEXT);
    this.text = text;//.trim();
  };
  extend(TextNode, Node);
  TextNode.prototype.toString = function() {
    return this.text;
  };
  TextNode.prototype.render = function(options) {
    return this.text;
  };

  /// -----------------------------------------------------------------------
  ///                             TAG NODE
  /// -----------------------------------------------------------------------
  var CompoundNode = function(tag, parent) {
    Node.call(this, parent, NODE_TYPE_TAG);
    this.tag = tag;
    this.nodes = [];
  };
  extend(CompoundNode, Node);
  CompoundNode.prototype.toString = function() {
    /// combin the result of child nodes
    var res = '';
    this.nodes.forEach(function(n) {
      res += n.toString();
    });
    if (this.tag !== '')
      return this.tag + ' ' + res + this.tag + '*';
    return res;
  };

  CompoundNode.prototype.addChild = function(node) {
    this.nodes.push(node);
  };

  CompoundNode.prototype.render = function(options) {
    /// combin the result of child nodes
    var res = '';
    this.nodes.forEach(function(n) {
      res += n.render(options);
    });

    if (options.renderMode == RENDER_TEXT)
      return res;
    else if (options.renderMode == RENDER_HTML) {
      if (this.tag === '')
        return res;
      return '<span class="' + htmlTag(this.tag) + '">' + res + '</span>';
    }
    return res;
  };

  function buildTextNode(str, from, to, node) {
    var text = str.substring(from, to);
    return new TextNode(text, node);
  }

  /// -----------------------------------------------------------------------
  ///                      PARSE VERSE IN USFM FORMAT
  /// -----------------------------------------------------------------------
  var USFM_VerseParser = function(str, ind, arr, re, node) {
    if (re === null) {
      re = /(\\\+?(\w+)\*?)\s?/gm;
      arr = re.exec(str);
      ind = 0;
    }

    if (arr !== null) {

      // collect the available text
      if (ind < arr.index) {
        node.addChild(buildTextNode(str, ind, arr.index, node));
      }

      var tag = arr[1];
      if (openingTag(tag)) {
        var compoundNode = new CompoundNode(tag, node);
        node.addChild(compoundNode);
        ind = arr.index + arr[0].length;
        arr = re.exec(str);
        USFM_VerseParser(str, ind, arr, re, compoundNode);
        return;
      } else {
        ind = arr.index + arr[1].length;
        arr = re.exec(str);
        USFM_VerseParser(str, ind, arr, re, node.parent);
        return;
      }

    }

    // collect remaining text
    if (ind < str.length) {
      node.addChild(buildTextNode(str, ind, str.length, node));
    }
  };

  /// -----------------------------------------------------------------------
  ///                         VERSE CLASS
  /// -----------------------------------------------------------------------
  var Verse = function(str, number) {
    this.number = number;
    this.node   = new CompoundNode('', null);
    USFM_VerseParser(str, 0, null, null, this.node);
  };

  //var original = '\\xy \\add 1\\nd 2\\wj 3\\wj*\\nd*\\add*4\\xy*';
  //var original = '\\m 1\\x 2\\y 3\\z 4\\z*5\\y*6\\x*7\\m*';
  //var original = '\\m this is \\x a simple text.\\y keep going.\\z hello\\z*world\\y*\\x*BYE!\\m*';
  var str = ROM_9_9;

  //options.renderMode = RENDER_TEXT;
  var verse = new Verse(str);
  var rendered = verse.node.render(options);

  //console.log('original: %s\n', str);
  //console.log('restored: %s\n', restored);
  //console.log('rendered: %s\n', rendered);



  /// -----------------------------------------------------------------------
  ///                         TESTING STUFF
  /// -----------------------------------------------------------------------
  describe("Verse parsing", function() {
    it("valid USFM parsing", function() {
      var verses = [];
      //verses.push('\\m 1\\x 2\\y 3\\z 4\\z*5\\y*6\\x*7\\m*');
      verses.push(LUK_18_19);
      verses.push(GEN_1_2);
      verses.push(ROM_9_9);

      verses.forEach(function(vstr) {
        var verse = new Verse(vstr);
        var restored = verse.node.toString();
        expect(vstr).toBe(restored);
      });
    });
  });


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

// walk('d:/projects/draft/savebible/attempt2/արևելահայերեն/', function(err, results) {
//    if (err) throw err;
//    //console.log(results);
//    results.forEach(fix_files);

//    cc.display(function(c) {
//       return !c.toString().match(/[Ա-Ֆ]/gi);
//    });
// });



/*
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
  */