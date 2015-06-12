/*------------------------------------------------------------------------*/
// writing into buffer

var buf = new Buffer(100);
var names = ['Hayk', 'Հայկ', 'Айк'];
var offset = 0;
var written = 0;
var result = '';

var bufferWriter = function(str) {
  written = buf.write(str, offset);
  offset += written;
  return offset;
};

for (var i = 0; i < 1000000; ++i) {
  offset = 0;
  written = 0;
  names.forEach(bufferWriter);
  result = buf.toString('utf8', 0, offset);
}


/*------------------------------------------------------------------------*/
// saving configuration file
nconf.save(function (err) {
  if (err) {
    console.log(err);
    return;
  }
  fs.readFile('./config/config.json', function (err, data) {
    console.dir(JSON.parse(data.toString()));
  });
});


/*------------------------------------------------------------------------*/
// logging types
logger.trace('trace');
logger.debug('debug');
logger.info('info');
logger.warn('warn');
logger.error('error');
logger.fatal('fatal');
