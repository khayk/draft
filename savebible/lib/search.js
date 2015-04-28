var _     = require('underscore');
var funcs = require('./functionality.js');

var Dictionary = funcs.Dictionary;

// helper function for search module
function resultLogger(desc, word, result) {
  return;
  if (result !== null)
    console.log(desc + ' [%d]: %s -> %j', result.length, word, result);
  else
    console.log(desc + ' [0]: %s', word);
  //console.log('');
}

function unify(arr) {
  arr.sort();
  return _.unique(arr);
}

function runQuery(arr, dict) {
  if (_.isArray(arr) ) {
    var result = [];
    arr.forEach(function(w) {
      var tmp = dict.find(w);
      if (tmp !== null)
        result = result.concat(tmp);
    });

    result = unify(result);
    if (result.length === 0)
      return null;
    return result;
  }
  else
    throw 'Expected Array as an argument';
}

function selectCondidates(word, dict) {
  var tmp = dict.find(word);
  var condidates = [];
  if (tmp !== null)
    condidates = tmp.concat(word);
  return condidates;
}


// Search functionality
var Search = function() {
  // key: original word from bible,
  // ref: array of references to bible verses
  var dict_    = new Dictionary('original words');

  // here we keep only those keys from dict_ where lowercase(key) != key
  // key: lowercase word from key of `dict_`
  // ref: array of words containing in dict as keys
  var cim_     = new Dictionary('lowercase words');

  // key: sub word of each unique word presented in `dict_`
  // ref: array of words from `dict_` keys
  var swm_     = new Dictionary('partial words');

  // the same usage as the `swm_` with the differenct that all keys are
  // lowercase
  var ciswm_   = new Dictionary('lowercase partial words');

  function updateSubWordDict(word, ref, dict) {
    var len = word.length - 1;
    while (len > 2) {
      var wp = word.substr(0, len);
      dict.add(wp, ref);
      --len;
    }
  }

  function updateCaseInsensitiveDict(word) {
    var ciWord = word.toLowerCase();
    cim_.add(ciWord, word);
    updateSubWordDict(ciWord, word, ciswm_);
  }


  return {
    // add specified `word` into dictionary
    // during search `ref` should be returned
    add: function(word, ref) {
      word = word.trim();

      // ignore empty strings
      if (word.length === 0)
        return;

      dict_.add(word, ref);
      updateSubWordDict(word, word, swm_);
      updateCaseInsensitiveDict(word);
    },

    // build index should be call if words addition is completed
    buildIndex: function() {
      dict_.optimize();
      dict_.verify();

      cim_.optimize();
      cim_.verify();

      swm_.optimize();
      swm_.verify();

      ciswm_.optimize();
      ciswm_.verify();
    },

    getDictionary: function() {
      return dict_;
    },

    // show internal state of dicitonaries
    displayStatistics: function() {
      console.log('CS    words: %d', dict_.count());
      console.log('CI    words: %d', cim_.count());
      console.log('SUB   words: %d', swm_.count());
      console.log('CISUB words: %d', ciswm_.count());

      var stat = dict_.stat(false, 100);
      console.log('MAIN total count: ', stat.total);
      //console.log('MAIN index: ', stat.index, '\n');

      stat = cim_.stat(false, 100);
      console.log('CIM total count: ', stat.total);
      //console.log('CIM index: ', stat.index, '\n');

      stat = swm_.stat(false, 100);
      console.log('SWM total count: ', stat.total);
      //console.log('SWM index: ', stat.index, '\n');

      stat = ciswm_.stat(false, 100);
      console.log('CISWM total count: ', stat.total);
      //console.log('CISWM index: ', stat.index, '\n');
    },

    // search specifed word and return array of references
    // if succeeded, otherwise returns null
    // {cs: bool, ww: bool}
    // cs -> case sensitive
    // ww -> whole word
    searchWord: function(word, opts) {
      if (!_.isString(word))
        throw new TypeError('Bad arguments');

      if (!opts) {
        opts = { cs: true, ww: true };
      }
      else if (!_.isObject(opts)) {
        throw new TypeError('Bad arguments');
      }
      else {
        if (typeof opts.cs !== 'boolean')
          opts.cs = true;
        if (typeof opts.ww !== 'boolean')
          opts.ww = true;
      }

      var caseSensitive = opts.cs;
      var wholeWord     = opts.ww;
      var result, condidates;

      if (caseSensitive) {
        if (wholeWord) {
          result = dict_.find(word);
          resultLogger('CS && WW', word, result);
          return result;
        }
        else {
          condidates = selectCondidates(word, swm_);
          condidates.push(word);
          condidates = unify(condidates);

          //console.log('condidates: ', condidates);

          // now condidates contains all possible words that we
          // should lookup in the main dicitonary and merge results
          result = runQuery(condidates, dict_);
          resultLogger('CS', word, result);
          return result;
        }
      }

      // requested case insensitive words
      var ciWord = word.toLowerCase();
      if (wholeWord) {
        condidates = selectCondidates(ciWord, cim_);
        //console.log(condidates);
        //condidates = unify(condidates);

        result = runQuery(condidates, dict_);
        resultLogger('WW', word, result);
      }
      else {
        condidates = selectCondidates(ciWord, ciswm_);
        condidates = condidates.concat(selectCondidates(ciWord, cim_));
        if (ciWord !== word) {
          condidates.push(word);
        }
        condidates = unify(condidates);
        result = runQuery(condidates, dict_);
        resultLogger('', word, result);
      }
      return result;
    }
  };
};

exports.Search = Search;



