var lb     = require('../lib/bible');
var rndr   = require('../lib/renderers');
var path   = require('path');

// var _      = require('lodash');
// var fse    = require('fs-extra');
// var help   = require('../helpers');
// var cfg    = require('../config').cfg;
// var cmn    = require('../lib/common');
// var log    = require('log4js').getLogger('tls');
// var measur = new help.Measurer();

var opts = [
  {folder: 'usfm',   extension: '.usfm', renderer: new rndr.UsfmRenderer()                     }
  // {folder: 'pretty', extension: '.txt' , renderer: new rndr.PrettyRenderer()                },
  // {folder: 'text',   extension: '.txt' , renderer: new rndr.TextRenderer({textOnly: false}) },
  // {folder: 'html',   extension: '.html', renderer: new rndr.HtmlRenderer()                  }
];

var dir    = 'C:/Users/Hayk/Desktop/';
var input  = path.join(dir, 'eng-kjv_usfm');
var output = path.join(dir, 'eng-kjv_usfm [output]');

lb.MC.instance().linkTo('eng', 'en');
var bible = lb.loadBible(input);

// var guestBBM = lb.guessBBM(input);
// lb.BBM.activate(guestBBM);

lb.saveBible(output, bible, opts[0]);