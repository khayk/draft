(function() {

  var GEN_1_2 = '\\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*\n' +
    '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and\n' +
    'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*\n' +
    '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the\n' +
    'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of\n' +
    'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*\n' +
    '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the\n' +
    'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.';

  var ROM_9_9 = '\\zw \\+zws G1063 \\+zws*\\+zwm robinson:CONJ 2 \\+zwm*\\zw*For\\zx \\zx*\n' +
    '\\zw \\+zws G3778 \\+zws*\\+zwm robinson:D-NSM 5 \\+zwm*\\zw*this\\zx \\zx*\n' +
    '\\add is\\add* \\zw \\+zws G3588 G3056 \\+zws*\\+zwm robinson:T-NSM robinson:N-NSM 3 4 \\+zwm*\\zw*the\n' +
    'word\\zx \\zx* \\zw \\+zws G1860 \\+zws*\\+zwm robinson:N-GSF 1 \\+zwm*\\zw*of\n' +
    'promise\\zx \\zx*, \\zw \\+zws G2596 \\+zws*\\+zwm robinson:PREP 6 \\+zwm*\\zw*At\\zx \\zx*\n' +
    '\\zw \\+zws G5126 \\+zws*\\+zwm robinson:D-ASM 9 \\+zwm*\\zw*this\\zx \\zx*\n' +
    '\\zw \\+zws G3588 G2540 \\+zws*\\+zwm robinson:T-ASM robinson:N-ASM 7 8 \\+zwm*\\zw*time\\zx \\zx*\n' +
    '\\zw \\+zws G2064 \\+zws*\\+zwm robinson:V-FDI-1S 10 \\+zwm*\\zw*will I\n' +
    'come\\zx \\zx*, \\zw \\+zws G2532 \\+zws*\\+zwm robinson:CONJ 11 \\+zwm*\\zw*and\\zx \\zx*\n' +
    '\\zw \\+zws G3588 G4564 \\+zws*\\+zwm robinson:T-DSF robinson:N-DSF 13 14 \\+zwm*\\zw*Sara\\zx \\zx*\n' +
    '\\zw \\+zws G2071 \\+zws*\\+zwm robinson:V-FXI-3S 12 \\+zwm*\\zw*shall\n' +
    'have\\zx \\zx* \\zw \\+zws G5207 \\+zws*\\+zwm robinson:N-NSM 15 \\+zwm*\\zw*a\n' +
    'son\\zx \\zx*.';

  var LUK_18_19_KJV = 'And Jesus said unto him, \\wj  Why callest thou me good? none' +
    '\\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*';

  var LUK_18_19_ARM = 'Յիսուս նրան ասաց.\\wj «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ,\\+add այլ\\+add* միայն՝ Աստուած։\\wj*';

  //var original = '\\xy \\add 1\\nd 2\\wj 3\\wj*\\nd*\\add*4\\xy*';
  //var original = '\\m 1\\x 2\\y 3\\z 4\\z*5\\y*6\\x*7\\m*';
  //var original = '\\m this is \\x a simple text.\\y keep going.\\z hello\\z*world\\y*\\x*BYE!\\m*';


  // \qt  - Quoted text.
  //        Old Testament quotations in the New Testament
  // \add - Translator's addition.
  // \wj  - Words of Jesus.
  // \nd  - Name of God (name of Deity).
  var CORE_TAGS = /add|wj|nd|qt/g;

  function extend(child, parent) {
    var fnObj = function() {};
    fnObj.prototype = parent.prototype;
    child.prototype = new fnObj();
    child.prototype.constructor = child;
    child.uber = parent.prototype;
  }

  // identify tags that can be ignored
  function supportedTag(tag) {
    return (tag.match(CORE_TAGS) !== null);
  }

  function openingTag(str) {
    return str[str.length - 1] !== '*';
  }

  // HTML tag from USFM tag
  function getHtmlTag(tag) {
    var mt = tag.match(CORE_TAGS);
    if (mt !== null)
      return mt;
    return 'unknown';
  }

  var Tags = function() {
    //this.tags = [];
  };

  Tags.prototype = {
    isSupported: function(tag) {
      return true;
    },

    isOpening: function(tag) {

    },

    /// returns a name of the tag without special symbols (\wj -> wj, \+add -> add)
    /// if the tag is not supported, the default value will be returned
    name: function(tag, def) {
      def = def || 'unknown';
    }
  };

  var NODE_TYPE_TEXT = 1;
  var NODE_TYPE_TAG  = 2;

  // options.renderMode  valid values
  var RENDER_TEXT = 1;
  var RENDER_HTML = 2;
  var RENDER_USFM = 3;

  // bible view options
  var ViewOptions = function() {
    this.renderMode    = RENDER_USFM;
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
    throw 'implement "addChild" in the derived class';
  };

  Node.prototype.render = function(options) {
    throw 'implement "render" in the derived class';
  };

  Node.prototype.type = function() {
    return this.type;
  };

  /// -----------------------------------------------------------------------
  ///                             TEXT NODE
  /// -----------------------------------------------------------------------
  var TextNode = function(text, parent) {
    Node.call(this, parent, NODE_TYPE_TEXT);
    this.text = text;
  };
  extend(TextNode, Node);
  TextNode.prototype.render = function(renderer) {
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

  CompoundNode.prototype.addChild = function(node) {
    this.nodes.push(node);
  };

  CompoundNode.prototype.render = function(renderer) {
    /// combin the result of child nodes
    var res = '';
    this.nodes.forEach(function(n) {
      res += n.render(renderer);
    });

    return renderer.renderNode(this, res);

    // if (options.renderMode == RENDER_TEXT) {
    //   return res;
    // }
    // else if (options.renderMode == RENDER_USFM) {
    //   if (this.tag === '')
    //     return res;
    //   return this.tag + ' ' + res + this.tag + '*';
    // }
    // else if (options.renderMode == RENDER_HTML) {
    //   if (this.tag === '')
    //     return res;
    //   return '<span class="' + getHtmlTag(this.tag) + '">' + res + '</span>';
    // }
    // return res;
  };

  function appendChildTextNode(node, str, from, to) {
    var text = str.substring(from, to);
    if (text.length > 0)
      node.addChild(new TextNode(text, node));
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
      if (ind < arr.index && node !== null) {
        appendChildTextNode(node, str, ind, arr.index);
      }

      var tag = arr[1];
      if (openingTag(tag)) {
        var compoundNode = new CompoundNode(tag, node);

        // collect supported tags
        if (supportedTag(tag)) {
            node.addChild(compoundNode);
        }

        ind = arr.index + arr[0].length;
        arr = re.exec(str);

        USFM_VerseParser(str,
                         ind,
                         arr,
                         re,
                         compoundNode);
        return;
      } else {
        // closing tag
        ind = arr.index + arr[1].length;
        arr = re.exec(str);
        USFM_VerseParser(str, ind, arr, re, node.parent);
        return;
      }
    }

    // collect remaining text
    if (ind < str.length && node !== null) {
      appendChildTextNode(node, str, ind, str.length);
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

  Verse.prototype.render = function(renderer) {
    return renderer.renderVerse(this);
  };


  /// -----------------------------------------------------------------------
  ///                         RENDERER CLASS
  /// -----------------------------------------------------------------------
  var Renderer = function() {
  };

  Renderer.prototype.renderBible   = function(bible) { throw 'implement renderer'; };
  Renderer.prototype.renderBook    = function(book) { throw 'implement renderer'; };
  Renderer.prototype.renderChapter = function(chapter) { throw 'implement renderer'; };
  Renderer.prototype.renderVerse   = function(verse) { throw 'implement renderer'; };
  Renderer.prototype.renderNode    = function(node, res) { throw 'implement renderer'; };

  // Renderer.prototype = {
  //   renderBible: function(bible) { throw 'implement renderer'; },
  //   renderBook: function(book) { throw 'implement renderer'; },
  //   renderChapter: function(chapter) { throw 'implement renderer'; },
  //   renderVerse: function(verse) { throw 'implement renderer'; },
  //   renderNode: function(node) { throw 'implement renderer'; }
  // };

  var USFMRenderer = function() {
  };
  extend(USFMRenderer, Renderer);
  USFMRenderer.prototype.renderVerse = function(verse) {
    return verse.node.render(this);
  };

  USFMRenderer.prototype.renderNode = function(node, res) {
    if (node.tag === '')
      return res;
    return node.tag + ' ' + res + node.tag + '*';
  };

  var DEV_STR  = GEN_1_2;//'\\x \\wj should be ignored\\wj*\\x*';
  var str      = DEV_STR.replace(/\n/g, ' ');
  var verse    = new Verse(str);

  var renderer = new USFMRenderer();
  var result   = verse.render(renderer);

  console.log('original: %s\n', str);
  console.log('restored: %s\n', result);

  /// -----------------------------------------------------------------------
  ///                         TESTING STUFF
  /// -----------------------------------------------------------------------
  describe("Verse parsing", function() {
    it("valid USFM parsing", function() {
      var verses = [];

      verses.push({orig: '\\add x\\add*', parsed: '\\add x\\add*'});
      verses.push({orig: '\\m 1\\x 2\\y 3\\z 4\\z*5\\y*6\\x*7\\m*', parsed: ''});
      verses.push({orig: LUK_18_19_ARM, parsed: 'Յիսուս նրան ասաց.\\wj «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ,\\+add այլ\\+add* միայն՝ Աստուած։\\wj*'});
      verses.push({orig: LUK_18_19_KJV, parsed: 'And Jesus said unto him, \\wj  Why callest thou me good? none\\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*'});
      verses.push({orig: GEN_1_2, parsed: 'And the earth was without form, and void; and darkness \\add was\\add* upon the face of the deep. And the Spirit of God moved upon the face of the waters.'});
      verses.push({orig: ROM_9_9, parsed: 'For this \\add is\\add* the word of promise, At this time will I come, and Sara shall have a son.'});
      verses.push({orig: 'text no tags', parsed: 'text no tags'});
      //verses.push({orig: '', parsed: ''});

      var renderer  = new USFMRenderer();
      verses.forEach(function(o) {
        var orig = o.orig.replace(/\n/g, ' ').trim();
        var verse = new Verse(orig);
        var restored = verse.render(renderer);
        expect(o.parsed).toBe(restored);
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



/*

var bible = new Bible();
var renderer = new USFMRenderer();

ViewSettings = function() {
    paragraphMode: false,
    showTitles: true,
    showNumbers: true,
    boldQuotes: true,
    highlightJesusWords: true,
    translatorAddition:
}
*/

