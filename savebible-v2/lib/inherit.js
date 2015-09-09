;(function() {
  'use strict';

  var _ = require('lodash');

  function inherit(child, base, props) {
    child.prototype = _.create(base.prototype, _.assign({
      '_super': base.prototype,
      'constructor': child
    }, props));
    return child;
  }

  exports.inherit = inherit;
})();
