"use strict";

exports.__esModule = true;
exports.default = _default;

var _helperHoistVariables = _interopRequireDefault(require("@babel/helper-hoist-variables"));

var t = _interopRequireWildcard(require("@babel/types"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var visitor = {
  enter: function enter(path, state) {
    if (path.isThisExpression()) {
      state.foundThis = true;
    }

    if (path.isReferencedIdentifier({
      name: "arguments"
    })) {
      state.foundArguments = true;
    }
  },
  Function: function Function(path) {
    path.skip();
  }
};

function _default(path, scope) {
  if (scope === void 0) {
    scope = path.scope;
  }

  var node = path.node;
  var container = t.functionExpression(null, [], node.body, node.generator, node.async);
  var callee = container;
  var args = [];
  (0, _helperHoistVariables.default)(path, function (id) {
    return scope.push({
      id: id
    });
  });
  var state = {
    foundThis: false,
    foundArguments: false
  };
  path.traverse(visitor, state);

  if (state.foundArguments) {
    callee = t.memberExpression(container, t.identifier("apply"));
    args = [];

    if (state.foundThis) {
      args.push(t.thisExpression());
    }

    if (state.foundArguments) {
      if (!state.foundThis) args.push(t.nullLiteral());
      args.push(t.identifier("arguments"));
    }
  }

  var call = t.callExpression(callee, args);
  if (node.generator) call = t.yieldExpression(call, true);
  return t.returnStatement(call);
}