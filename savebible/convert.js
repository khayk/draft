(function() {
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


  /// -----------------------------------------------------------------------
  ///                      NODE - THE BASE CLASS
  /// -----------------------------------------------------------------------
  var Node = function(parent) {
    this.parent = parent;
    this.nodes = [];
  };

  Node.prototype.addChild = function(node) {
    this.nodes.push(node);
  };

  Node.prototype.toString = function() {
    var res = '';
    this.nodes.forEach(function(n) {
      res += n.toString();
    });
    return res;
  };

  Node.prototype.render = function() {

  };

  /// -----------------------------------------------------------------------
  ///                             TEXT NODE
  /// -----------------------------------------------------------------------
  var TextNode = function(text, parent) {
    Node.call(this, parent);
    this.text = text;
  };
  extend(TextNode, Node);
  // TextNode.prototype = Object.create(Node.prototype);
  // TextNode.prototype.constructor = TextNode;

  TextNode.prototype.toString = function() {
    return this.text + Node.prototype.toString.call(this);
  };

  /// -----------------------------------------------------------------------
  ///                             TAG NODE
  /// -----------------------------------------------------------------------
  var TagNode = function(tag, parent) {
    Node.call(this, parent);
    this.tag = tag;
  };
  extend(TagNode, Node);
  // TagNode.prototype = Object.create(Node.prototype);
  // TagNode.prototype.constructor = TagNode;

  TagNode.prototype.toString = function() {
    return this.tag + ' ' + Node.prototype.toString.call(this) + this.tag + '*';
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
        var tagNode = new TagNode(tag, node);
        node.addChild(tagNode);
        ind = arr.index + arr[0].length;
        arr = re.exec(str);
        USFM_VerseParser(str, ind, arr, re, tagNode);
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
    this.node   = new Node(null);
    USFM_VerseParser(str, 0, null, null, this.node);
  };

  // function VerseView() {
  //   this.display = function(v) {
  //     var res = v.number + ' ';
  //     v.node.
  //   };
  // }

  var orig = '\\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*' +
    '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and' +
    'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*' +
    '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the' +
    'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of' +
    'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*' +
    '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the' +
    'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.';

  //var orig = '\\xy \\add 1\\nd 2\\wj 3\\wj*\\nd*\\add*4\\xy*';
  //var orig = '\\m 1 \\x 2 \\y 3 \\z 4 \\z* 5 \\y* 6 \\x* 7\\m*';
  var v = new Verse(orig);
  var restored = v.node.toString();

  console.log(orig);
  console.log(restored);
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