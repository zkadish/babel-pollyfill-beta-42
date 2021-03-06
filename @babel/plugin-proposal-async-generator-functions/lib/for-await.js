"use strict";

exports.__esModule = true;
exports.default = _default;

var _core = require("@babel/core");

var buildForAwait = (0, _core.template)("\n  async function wrapper() {\n    var ITERATOR_COMPLETION = true;\n    var ITERATOR_HAD_ERROR_KEY = false;\n    var ITERATOR_ERROR_KEY;\n    try {\n      for (\n        var ITERATOR_KEY = GET_ITERATOR(OBJECT), STEP_KEY, STEP_VALUE;\n        (\n          STEP_KEY = await ITERATOR_KEY.next(),\n          ITERATOR_COMPLETION = STEP_KEY.done,\n          STEP_VALUE = await STEP_KEY.value,\n          !ITERATOR_COMPLETION\n        );\n        ITERATOR_COMPLETION = true) {\n      }\n    } catch (err) {\n      ITERATOR_HAD_ERROR_KEY = true;\n      ITERATOR_ERROR_KEY = err;\n    } finally {\n      try {\n        if (!ITERATOR_COMPLETION && ITERATOR_KEY.return != null) {\n          await ITERATOR_KEY.return();\n        }\n      } finally {\n        if (ITERATOR_HAD_ERROR_KEY) {\n          throw ITERATOR_ERROR_KEY;\n        }\n      }\n    }\n  }\n");

function _default(path, _ref) {
  var getAsyncIterator = _ref.getAsyncIterator;
  var node = path.node,
      scope = path.scope,
      parent = path.parent;
  var stepKey = scope.generateUidIdentifier("step");
  var stepValue = scope.generateUidIdentifier("value");
  var left = node.left;
  var declar;

  if (_core.types.isIdentifier(left) || _core.types.isPattern(left) || _core.types.isMemberExpression(left)) {
    declar = _core.types.expressionStatement(_core.types.assignmentExpression("=", left, stepValue));
  } else if (_core.types.isVariableDeclaration(left)) {
    declar = _core.types.variableDeclaration(left.kind, [_core.types.variableDeclarator(left.declarations[0].id, stepValue)]);
  }

  var template = buildForAwait({
    ITERATOR_HAD_ERROR_KEY: scope.generateUidIdentifier("didIteratorError"),
    ITERATOR_COMPLETION: scope.generateUidIdentifier("iteratorNormalCompletion"),
    ITERATOR_ERROR_KEY: scope.generateUidIdentifier("iteratorError"),
    ITERATOR_KEY: scope.generateUidIdentifier("iterator"),
    GET_ITERATOR: getAsyncIterator,
    OBJECT: node.right,
    STEP_VALUE: stepValue,
    STEP_KEY: stepKey
  });
  template = template.body.body;

  var isLabeledParent = _core.types.isLabeledStatement(parent);

  var tryBody = template[3].block.body;
  var loop = tryBody[0];

  if (isLabeledParent) {
    tryBody[0] = _core.types.labeledStatement(parent.label, loop);
  }

  return {
    replaceParent: isLabeledParent,
    node: template,
    declar: declar,
    loop: loop
  };
}