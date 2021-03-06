var fse    = require('fs-extra');
var util   = require('util');
var _      = require('lodash');
var path   = require('path');
var cfg    = require('./config').cfg;
var lb     = require('./lib/bible');
var cmn    = require('./lib/common');
var rnd    = require('./lib/renderers');
var log    = require('log4js').getLogger('psr');
var help   = require('./helpers');

var measur = new help.Measurer();

var NL     = cmn.NL;

var dirNames = [
  'en-kjv-usfm+',
  'en-kjv-usfm'
  // 'en-kjv-usfm+ [saved]'
];

var bids = ['MAT'];

//var indentedUsfmRenderer = new rnd.IndentedUsfmRenderer();
var usfmRenderer         = new rnd.UsfmRenderer();
var textRenderer         = new rnd.TextRenderer({textOnly: false});
var prettyRenderer       = new rnd.PrettyRenderer();
var htmlRenderer         = new rnd.HtmlRenderer();
var parser               = new lb.Parser();
//var parser               = new lb.Parser(TH.arrayIgnored());

measur.begin('loading bible: ');
bids.forEach(function(bid) {
  dirNames.forEach(function(dn) {
    var file = lb.findBook(cfg.bibleDir(dn).from, bid);
    if (file === null) {
      log.info('failed to find book with id: %s', bid);
      return;
    }

    log.info(file);
    var str = fse.readFileSync(file, 'utf8');
    var root = parser.parse(str);
    console.log('nodes count: ', root.count());

    fse.writeFileSync('data.pretty', prettyRenderer.renderNode(root, 0, 0));
    fse.writeFileSync('data.usfm', usfmRenderer.renderNode(root, 0, 0));
    //fse.writeFileSync('data.indented-usfm', indentedUsfmRenderer.renderNode(root, 0, 0));
    fse.writeFileSync('data.text', textRenderer.renderNode(root, 0, 0));
    fse.writeFileSync('data.html', htmlRenderer.renderNode(root, 0, 0));
  });
});
measur.end();
//return;


function handleDirectory(de) {
  // scan all books
  var dir = cfg.bibleDir(de).from;
  var to = path.join(cfg.tmpDir(), de, '/');
  fse.mkdirsSync(to);

  var files = fse.readdirSync(dir, 'utf8');
  var roots = [];
  var renderers = [
    {name: 'usfm',   ext: '.usfm',   renderer: usfmRenderer,         all: ''},
    {name: 'text',   ext: '.txt',    renderer: textRenderer,         all: ''}
    //{name: 'i-usfm', ext: '.i-usfm', renderer: indentedUsfmRenderer, all: ''}
  ];

  measur.begin('loading bible: ' + dir);
  files.forEach(function(file) {
    var fullpath = path.join(dir, file);
    var str = fse.readFileSync(fullpath, 'utf8');
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

    var root = parser.parse(str);
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
      ro.all += data + NL;
      fse.writeFileSync(fname + ro.ext, data);
    });
    //measur.end();
  });
  measur.end();

  renderers.forEach(function(ro) {
    fse.writeFileSync(to + ro.name + ro.ext, ro.all);
  });
}

dirNames.forEach(function(de) {
  //measur.begin('handle directory: ' + de);
  handleDirectory(de);
  //measur.end();
});

