var fs = require('fs');
var util = require('util');
var _ = require('lodash');
var path = require('path');
var cfg = require('./config').cfg;
var lb = require('./lib/bible');
var cmn = require('./lib/common');
var rnd = require('./lib/renderers');
var log = require('log4js').getLogger('psr');
var help = require('./helpers');

var measur = new help.Measurer();

var Node = cmn.Node;
var TAG = cmn.TAG;
var TH = cmn.TH;
var NH = cmn.NH;

var Stack = function() {
  this.values = [];
};

Stack.prototype.size = function() {
  return this.values.length;
};

Stack.prototype.empty = function() {
  return this.values.length === 0;
};

Stack.prototype.top = function() {
  if (this.values.length === 0)
    return null;
  return this.values[this.values.length - 1];
};

Stack.prototype.push = function(val) {
  this.values.push(val);
};

Stack.prototype.pop = function() {
  if (this.empty())
    return null;
  return this.values.pop();
};


var arr_cpq = ['c', 'p', 'q', ''];
var arr_cp = ['c', 'p'];
var arr_c = ['c', ''];
var arr_ = [''];

var USFMTree = function() {
  this.reset();
};

USFMTree.prototype.reset = function() {
  this.stack = new Stack();
  this.root = NH.createTag('');
  this.stack.push(this.root);
  this.nre = /\d+\s+/;
};

USFMTree.prototype.handle = function(arr) {
  var top = this.stack.top();
  while (arr.indexOf(top.tag) === -1) {
    var prev = this.stack.pop();

    // trim tailing spaces for last child nodes
    if (!TH.haveClosing(prev.tag)) {
      var last = prev.lastChild();
      if (last !== null && NH.isText(last))
        last.text = last.text.trimRight();
    }
    top = this.stack.top();
  }
  return top;
};

USFMTree.prototype.unwind = function(tag) {
  var top = null;
  while (true) {
    top = this.stack.top();
    if (top === null || top.tag === tag)
      break;
    if (!TH.haveClosing(top.tag)) {
      log.error('Expecting to see pair for ' + tag + ' but found ' + top.tag + ' instead');
      return;
    }
    this.stack.pop();
  }

  if (top !== null) {
    top = this.stack.pop();
  }
};


USFMTree.prototype.append = function(node) {
  var top = this.stack.top();
  if (NH.isTag(node)) {
    if (node.tag === TAG.V) {
      // \v - closed as soon as encountered \p, \q, \c or end of chapter
      top = this.handle(arr_cpq);
    } else if (node.tag === TAG.C) {
      // \c - closed as soon as encountered end of chapter
      top = this.handle(arr_);
    } else if (node.tag === TAG.Q) {
      // \q - closed as soon as encountered \p, \c or end of chapter
      top = this.handle(arr_cp);
    } else if (!TH.haveClosing(node.tag)) {
      // other single tags closed as soon as encountered \c or end of chapter
      top = this.handle(arr_c);
    }
  } else {
    if (top.tag === TAG.C || top.tag === TAG.V) {

      // setup number for verse or chapter
      if (_.isUndefined(top.number)) {
        var arr = this.nre.exec(node.text);
        if (arr === null)
          throw new Error('expecting to see number in: ' + node.text);

        top.number = arr[0].trim();
        node.text = node.text.substring(arr.index + arr[0].length);
      }

      if (node.text.length === 0)
        return;
    } else {
      if (node.text.trim().length === 0)
        return;
    }
  }
  top.addChild(node);
  if (NH.isTag(node))
    this.stack.push(node);
};



function parseUSFM(str) {
  var vre = /(\\\+?(\w+)\s?\*?)/gm;
  var tree = new USFMTree();
  var lastIndex = 0;
  var node = null;
  var content = '';
  str = str.replace(/\r/gm, '').replace(/\n|¶/gm, ' ').trim();

  function insertText(from, to) {
    content = str.substring(from, to);
    node = NH.createText(content);
    tree.append(node);
  }

  try {
    var arr = vre.exec(str);
    while (arr !== null) {
      var tag = arr[1];

      if (lastIndex != arr.index) {
        insertText(lastIndex, arr.index);
      }

      if (TH.isOpening(tag)) {
        tag = arr[2];
        node = NH.createTag(tag);
        tree.append(node);
      } else {
        tree.unwind(arr[2]);
      }

      lastIndex = vre.lastIndex;
      arr = vre.exec(str);
    }
    insertText(lastIndex);
  } catch (e) {
    log.error('error while parsing: ', e);
    log.warn('location ~  %s', str.substr(lastIndex, 40));
    throw e;
  }
  return tree.root;
}


var dirNames = [
  'en-kjv-usfm+',
  'en-kjv-usfm',
  'en-kjv-usfm+ [saved]'
  //'en-kjv-ptx'
  //'zed'
  //'am-eab-usfm-from-text',
  //'ru-synod-usfm-from-text [saved]'
];

var bids = ['SIR'];

var indentedUSFMRenderer = new rnd.IndentedUSFMRenderer();
var usfmRenderer         = new rnd.USFMRenderer();
var textRenderer         = new rnd.TextRenderer({textOnly: false});
var prettyRenderer       = new rnd.PrettyRenderer();

measur.begin('loading bible: ');
bids.forEach(function(bid) {
  dirNames.forEach(function(dn) {
    var file = lb.findBook(cfg.bibleDir(dn).from, bid);
    if (file === null) {
      log.info('failed to find book with id: %s', bid);
      return;
    }

    log.info(file);
    var str = fs.readFileSync(file, 'utf8');
    var root = parseUSFM(str);
    console.log("nodes count: ", root.count());

    fs.writeFileSync('data-pretty', prettyRenderer.renderNode(root, 0, 0));
    fs.writeFileSync('data-usfm', usfmRenderer.renderNode(root, 0, 0));
    fs.writeFileSync('data-indented-usfm', indentedUSFMRenderer.renderNode(root, 0, 0));
    fs.writeFileSync('data-text', textRenderer.renderNode(root, 0, 0));
  });
});
measur.end();
return;

function handleDirectory(de) {
  // scan all books
  var dir = cfg.bibleDir(de).from;
  var to = path.join(cfg.tmpDir(), de, '/');
  require('mkdirp').sync(to);

  var files = fs.readdirSync(dir, 'utf8');
  var roots = [];
  var renderers = [
    {name: 'usfm',   ext: '.usfm',   renderer: usfmRenderer,         all: ''},
    {name: 'text',   ext: '.txt',    renderer: textRenderer,         all: ''},
    {name: 'i-usfm', ext: '.i-usfm', renderer: indentedUSFMRenderer, all: ''}
  ];

  measur.begin('loading bible: ' + dir);
  files.forEach(function(file) {
    var fullpath = path.join(dir, file);
    var str = fs.readFileSync(fullpath, 'utf8');
    var opts = lb.decodeFileName(fullpath);
    if (opts === null) {
      opts = lb.decodeFileName(fullpath, false);
      opts.lang = 'eng';
      opts.bibleAbbr = 'kjv';
    }
    opts.strictFilename = true;
    opts.extension = '';
    var fname = lb.encodeFileName(opts.id, opts);
    //log.info('parsing file:  %s  ->  %s', file, fname);

    var root = parseUSFM(str);
    roots.push({
      root: root,
      fname: to + fname
    });
  });
  measur.end();


  measur.begin('rendering...');
  // render bibles and save on disc
  renderers.forEach(function(ro) {
    //measur.begin('rendering "' + ro.name + '" bible');

    roots.forEach(function(te) {
      var root = te.root;
      var fname = te.fname;
      var data = ro.renderer.renderNode(root, 0, 0);
      ro.all += data;
      fs.writeFileSync(fname + ro.ext, data);
    });

    //measur.end();
  });
  measur.end();

  renderers.forEach(function(ro) {
    fs.writeFileSync(to + ro.name + ro.ext, ro.all);
  });
}

dirNames.forEach(function(de) {
  //measur.begin('handle directory: ' + de);
  handleDirectory(de);
  //measur.end();
});

