var fs      = require('fs');
var bibm    = require('../lib/bible.js');

var BBM     = bibm.BBM;

/// hold name/id mapping information for specified file
var NIM = function(mappingFile) {
  this.nameId = {};
  this.idName = {};

  var data   = fs.readFileSync(mappingFile, 'utf8');
  var lines  = data.split('\n');

  for (var l in lines) {
    var line = lines[l].trim();
    if (line.length === 0)
      continue;

    var arr = line.split(':');
    if (arr.length !== 2)
      throw 'Invalid mapping file: ' + mappingFile + ', entry: ' + line;
    var id   = arr[0].trim();
    var name = arr[1].trim();

    if (!BBM.instance().existsId(id))
      throw 'Invalid book id: ' + id;
    //logger.info('id: %s,  name: %s', , arr[1].trim());


    // ensure name uniquness
    if (this.getName(name) !== null)
      throw 'Name already exists: ' + name;
    this.nameId[name] = id;

    // ensure id uniquness
    if (this.getId(id) !== null)
      throw 'Id already exists: ' + id;
    this.idName[id] = name;
  }
};

NIM.prototype.getId = function(name) {
  var ref = this.nameId[name];
  if (ref === void 0)
    return null;
  return ref;
};

NIM.prototype.getName = function(id) {
  var ref = this.idName[id];
  if (ref === void 0)
    return null;
  return ref;
};

exports.NIM = NIM;
