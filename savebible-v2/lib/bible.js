var fs   = require('fs');
var path = require('path');
var _    = require('lodash');
var help = require('./../helpers');

var logger = require('log4js').getLogger('bib');

;(function() {
  'use strict';

  /**
   * Load bible books from the specified directory and construct bible object
   * @param  {string} dir directory containing usfm files
   * @return {object}     bible object
   */
  var loadBible = function(dir) {
    var totalSize = 0;
    dir = path.normalize(dir + '/');
    var files = fs.readdirSync(dir, 'utf8');
    files.forEach(function(file) {
      var buff = fs.readFileSync(dir + file);
      totalSize += buff.length;
      console.log('file: %s, size: %s', file, help.bytesToSize(buff.length));
    });
    console.log('bible size: %s', help.bytesToSize(totalSize));
    return null;
  };


  var NH = (function() {
    return {
      isCompound: function(node) {
        if (!_.isUndefined(node.nodes))
          return true;
        return false;
      },

      isText: function(node) {
        if (!_.isUndefined(node.text))
          return true;
        return false;
      },

      normalize: function(node) {
        var current = null;
        node.nodes.forEach(function(n) {
          if (NH.isCompound(n)) {
            current = null;
            n.normalize();
          }
          else {
            if (current === null)
              current = n;
            else {
              current.text += n.text;
              n.text = '';
            }
          }
        });

        // now remove redundant nodes
        node.nodes = node.nodes.filter(function(n) {
          return !(NH.isText(n) && n.text === '');
        });
      }
    };
  })();


  var Node = function(parent) {
    this.parent = parent;
  };


  var Verse = function() {
    this.parent = null;
    this.number = 0;
    this.np     = false;
    this.node   = new Node(null);
  };

  var Parser = function() {

    this.parseVerseImpl = function(str, node) {

    };
  };

  Parser.prototype.parseVerse = function(str) {
    var verse = new Verse();
    this.parseVerseImpl(str, verse.node);
  };

  exports.loadBible = loadBible;

  exports.Verse = Verse;
  exports.Parser = Parser;

}.call(this));


