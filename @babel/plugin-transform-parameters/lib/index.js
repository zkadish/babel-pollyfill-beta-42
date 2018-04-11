"use strict";

exports.__esModule = true;
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _params = _interopRequireDefault(require("./params"));

var _rest = _interopRequireDefault(require("./rest"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (0, _helperPluginUtils.declare)(function (api, options) {
  api.assertVersion(7);
  var loose = options.loose;
  return {
    visitor: {
      Function: function Function(path) {
        if (path.isArrowFunctionExpression() && path.get("params").some(function (param) {
          return param.isRestElement() || param.isAssignmentPattern();
        })) {
          path.arrowFunctionToExpression();
        }

        var convertedRest = (0, _rest.default)(path);
        var convertedParams = (0, _params.default)(path, loose);

        if (convertedRest || convertedParams) {
          path.scope.crawl();
        }
      }
    }
  };
});

exports.default = _default;