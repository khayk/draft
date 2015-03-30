var Configs = (function() {
  var dropboxDir = 'c:/Users/Hayk/Dropbox/';
  var dataDir    = 'Data/';
  var uniformDir = './uniform/';

  return {
    en_kjv_usfm: function() {
      var from_ = dropboxDir + dataDir + 'en-kjv-usfm';
      var to_   = './';
      return {from: from_, to: to_};
    },

    en_kjv_usfm_plus: function() {
      var from_ = dropboxDir + dataDir + 'en-kjv-usfm+';
      var to_   = './';
      return {from: from_, to: to_};
    },

    am_eab_text: function() {
      var from_ = dropboxDir + dataDir + 'am_eab_text';
      var to_   = uniformDir + 'eab/';
      return {from: from_, to: to_};
    },

    ru_synod_text: function() {
      var from_ = dropboxDir + dataDir + 'ru_synod_text';
      var to_   = uniformDir + 'synod/';
      return {from: from_, to: to_};
    },

    en_kjv_ptx: function() {
      var from_ = dropboxDir + dataDir + 'en_kjv_ptx';
      var to_   = '';
      return {from: from_, to: to_};
    },

    info_name: function() {
      return 'bible.info';
    },

    combined_name: function() {
      return 'bible.txt';
    }
  };
})();

//console.log(Configs.usfm_kjv());

module.exports.Configs = Configs;
