var Configs = (function() {
  //var dropboxDir = 'c:/Users/Hayk/Dropbox/';
  var dropboxDir = '/home/hayk/Downloads/';
  var dataDir    = 'Data/';
  var uniformDir = '../uniform/';

  return {
    am_eab_text: function() {
      var from_ = dropboxDir + dataDir + 'am-eab-text';
      var to_   = uniformDir + 'eab/';
      return {from: from_, to: to_};
    },

    am_grabar_text: function() {
      var from_ = dropboxDir + dataDir + 'am_grabar_text';
      var to_   = uniformDir + 'grabar/';
      return {from: from_, to: to_};
    },

    ru_synod_text: function() {
      var from_ = dropboxDir + dataDir + 'ru-synod-text';
      var to_   = uniformDir + 'synod/';
      return {from: from_, to: to_};
    },

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

    en_kjv_ptx: function() {
      var from_ = dropboxDir + dataDir + 'en-kjv-ptx';
      var to_   = '';
      return {from: from_, to: to_};
    },

    en_kjv_protector: function() {
      var from_ = dropboxDir + dataDir + 'en-kjv-protector-text';
      var to_   = uniformDir + 'kjv-prot/';
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
