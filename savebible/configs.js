var Configs = (function() {
  var dropboxDir = 'c:/Users/Hayk/Dropbox/';
  var dataDir    = 'Data/';

  return {
    usfm_kjv: function() {
      return dropboxDir + dataDir + 'usfm-kjv';
    },

    usfm_kjv_plus: function() {
      return dropboxDir + dataDir + 'usfm-kjv+';
    },

    text_arm: function() {
      return dropboxDir + dataDir + 'txt-arm';
    },

    ptx: function() {
      return dropboxDir + dataDir + 'ptx';
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
