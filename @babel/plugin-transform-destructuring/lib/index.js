"use strict";

exports.__esModule = true;
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _core = require("@babel/core");

var _default = (0, _helperPluginUtils.declare)(function (api, options) {
  api.assertVersion(7);
  var _options$loose = options.loose,
      loose = _options$loose === void 0 ? false : _options$loose,
      _options$useBuiltIns = options.useBuiltIns,
      useBuiltIns = _options$useBuiltIns === void 0 ? false : _options$useBuiltIns;

  if (typeof loose !== "boolean") {
    throw new Error(".loose must be a boolean or undefined");
  }

  var arrayOnlySpread = loose;

  function getExtendsHelper(file) {
    return useBuiltIns ? _core.types.memberExpression(_core.types.identifier("Object"), _core.types.identifier("assign")) : file.addHelper("extends");
  }

  function variableDeclarationHasPattern(node) {
    var _arr = node.declarations;

    for (var _i = 0; _i < _arr.length; _i++) {
      var declar = _arr[_i];

      if (_core.types.isPattern(declar.id)) {
        return true;
      }
    }

    return false;
  }

  function hasRest(pattern) {
    var _arr2 = pattern.elements;

    for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
      var elem = _arr2[_i2];

      if (_core.types.isRestElement(elem)) {
        return true;
      }
    }

    return false;
  }

  var arrayUnpackVisitor = {
    ReferencedIdentifier: function ReferencedIdentifier(path, state) {
      if (state.bindings[path.node.name]) {
        state.deopt = true;
        path.stop();
      }
    }
  };

  var DestructuringTransformer = function () {
    function DestructuringTransformer(opts) {
      this.blockHoist = opts.blockHoist;
      this.operator = opts.operator;
      this.arrays = {};
      this.nodes = opts.nodes || [];
      this.scope = opts.scope;
      this.kind = opts.kind;
      this.arrayOnlySpread = opts.arrayOnlySpread;
      this.addHelper = opts.addHelper;
    }

    var _proto = DestructuringTransformer.prototype;

    _proto.buildVariableAssignment = function buildVariableAssignment(id, init) {
      var op = this.operator;
      if (_core.types.isMemberExpression(id)) op = "=";
      var node;

      if (op) {
        node = _core.types.expressionStatement(_core.types.assignmentExpression(op, id, _core.types.cloneNode(init)));
      } else {
        node = _core.types.variableDeclaration(this.kind, [_core.types.variableDeclarator(id, _core.types.cloneNode(init))]);
      }

      node._blockHoist = this.blockHoist;
      return node;
    };

    _proto.buildVariableDeclaration = function buildVariableDeclaration(id, init) {
      var declar = _core.types.variableDeclaration("var", [_core.types.variableDeclarator(_core.types.cloneNode(id), _core.types.cloneNode(init))]);

      declar._blockHoist = this.blockHoist;
      return declar;
    };

    _proto.push = function push(id, _init) {
      var init = _core.types.cloneNode(_init);

      if (_core.types.isObjectPattern(id)) {
        this.pushObjectPattern(id, init);
      } else if (_core.types.isArrayPattern(id)) {
        this.pushArrayPattern(id, init);
      } else if (_core.types.isAssignmentPattern(id)) {
        this.pushAssignmentPattern(id, init);
      } else {
        this.nodes.push(this.buildVariableAssignment(id, init));
      }
    };

    _proto.toArray = function toArray(node, count) {
      if (this.arrayOnlySpread || _core.types.isIdentifier(node) && this.arrays[node.name]) {
        return node;
      } else {
        return this.scope.toArray(node, count);
      }
    };

    _proto.pushAssignmentPattern = function pushAssignmentPattern(_ref, valueRef) {
      var left = _ref.left,
          right = _ref.right;
      var tempId = this.scope.generateUidIdentifierBasedOnNode(valueRef);
      this.nodes.push(this.buildVariableDeclaration(tempId, valueRef));

      var tempConditional = _core.types.conditionalExpression(_core.types.binaryExpression("===", _core.types.cloneNode(tempId), this.scope.buildUndefinedNode()), right, _core.types.cloneNode(tempId));

      if (_core.types.isPattern(left)) {
        var patternId;
        var node;

        if (this.kind === "const") {
          patternId = this.scope.generateUidIdentifier(tempId.name);
          node = this.buildVariableDeclaration(patternId, tempConditional);
        } else {
          patternId = tempId;
          node = _core.types.expressionStatement(_core.types.assignmentExpression("=", _core.types.cloneNode(tempId), tempConditional));
        }

        this.nodes.push(node);
        this.push(left, patternId);
      } else {
        this.nodes.push(this.buildVariableAssignment(left, tempConditional));
      }
    };

    _proto.pushObjectRest = function pushObjectRest(pattern, objRef, spreadProp, spreadPropIndex) {
      var keys = [];

      for (var i = 0; i < pattern.properties.length; i++) {
        var prop = pattern.properties[i];
        if (i >= spreadPropIndex) break;
        if (_core.types.isRestElement(prop)) continue;
        var key = prop.key;

        if (_core.types.isIdentifier(key) && !prop.computed) {
          key = _core.types.stringLiteral(prop.key.name);
        }

        keys.push(_core.types.cloneNode(key));
      }

      var value;

      if (keys.length === 0) {
        value = _core.types.callExpression(getExtendsHelper(this), [_core.types.objectExpression([]), _core.types.cloneNode(objRef)]);
      } else {
        keys = _core.types.arrayExpression(keys);
        value = _core.types.callExpression(this.addHelper("objectWithoutProperties"), [_core.types.cloneNode(objRef), keys]);
      }

      this.nodes.push(this.buildVariableAssignment(spreadProp.argument, value));
    };

    _proto.pushObjectProperty = function pushObjectProperty(prop, propRef) {
      if (_core.types.isLiteral(prop.key)) prop.computed = true;
      var pattern = prop.value;

      var objRef = _core.types.memberExpression(_core.types.cloneNode(propRef), prop.key, prop.computed);

      if (_core.types.isPattern(pattern)) {
        this.push(pattern, objRef);
      } else {
        this.nodes.push(this.buildVariableAssignment(pattern, objRef));
      }
    };

    _proto.pushObjectPattern = function pushObjectPattern(pattern, objRef) {
      if (!pattern.properties.length) {
        this.nodes.push(_core.types.expressionStatement(_core.types.callExpression(this.addHelper("objectDestructuringEmpty"), [objRef])));
      }

      if (pattern.properties.length > 1 && !this.scope.isStatic(objRef)) {
        var temp = this.scope.generateUidIdentifierBasedOnNode(objRef);
        this.nodes.push(this.buildVariableDeclaration(temp, objRef));
        objRef = temp;
      }

      for (var i = 0; i < pattern.properties.length; i++) {
        var prop = pattern.properties[i];

        if (_core.types.isRestElement(prop)) {
          this.pushObjectRest(pattern, objRef, prop, i);
        } else {
          this.pushObjectProperty(prop, objRef);
        }
      }
    };

    _proto.canUnpackArrayPattern = function canUnpackArrayPattern(pattern, arr) {
      if (!_core.types.isArrayExpression(arr)) return false;
      if (pattern.elements.length > arr.elements.length) return;

      if (pattern.elements.length < arr.elements.length && !hasRest(pattern)) {
        return false;
      }

      var _arr3 = pattern.elements;

      for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
        var elem = _arr3[_i3];
        if (!elem) return false;
        if (_core.types.isMemberExpression(elem)) return false;
      }

      var _arr4 = arr.elements;

      for (var _i4 = 0; _i4 < _arr4.length; _i4++) {
        var _elem = _arr4[_i4];
        if (_core.types.isSpreadElement(_elem)) return false;
        if (_core.types.isCallExpression(_elem)) return false;
        if (_core.types.isMemberExpression(_elem)) return false;
      }

      var bindings = _core.types.getBindingIdentifiers(pattern);

      var state = {
        deopt: false,
        bindings: bindings
      };
      this.scope.traverse(arr, arrayUnpackVisitor, state);
      return !state.deopt;
    };

    _proto.pushUnpackedArrayPattern = function pushUnpackedArrayPattern(pattern, arr) {
      for (var i = 0; i < pattern.elements.length; i++) {
        var elem = pattern.elements[i];

        if (_core.types.isRestElement(elem)) {
          this.push(elem.argument, _core.types.arrayExpression(arr.elements.slice(i)));
        } else {
          this.push(elem, arr.elements[i]);
        }
      }
    };

    _proto.pushArrayPattern = function pushArrayPattern(pattern, arrayRef) {
      if (!pattern.elements) return;

      if (this.canUnpackArrayPattern(pattern, arrayRef)) {
        return this.pushUnpackedArrayPattern(pattern, arrayRef);
      }

      var count = !hasRest(pattern) && pattern.elements.length;
      var toArray = this.toArray(arrayRef, count);

      if (_core.types.isIdentifier(toArray)) {
        arrayRef = toArray;
      } else {
        arrayRef = this.scope.generateUidIdentifierBasedOnNode(arrayRef);
        this.arrays[arrayRef.name] = true;
        this.nodes.push(this.buildVariableDeclaration(arrayRef, toArray));
      }

      for (var i = 0; i < pattern.elements.length; i++) {
        var elem = pattern.elements[i];
        if (!elem) continue;
        var elemRef = void 0;

        if (_core.types.isRestElement(elem)) {
          elemRef = this.toArray(arrayRef);
          elemRef = _core.types.callExpression(_core.types.memberExpression(elemRef, _core.types.identifier("slice")), [_core.types.numericLiteral(i)]);
          elem = elem.argument;
        } else {
          elemRef = _core.types.memberExpression(arrayRef, _core.types.numericLiteral(i), true);
        }

        this.push(elem, elemRef);
      }
    };

    _proto.init = function init(pattern, ref) {
      if (!_core.types.isArrayExpression(ref) && !_core.types.isMemberExpression(ref)) {
        var memo = this.scope.maybeGenerateMemoised(ref, true);

        if (memo) {
          this.nodes.push(this.buildVariableDeclaration(memo, _core.types.cloneNode(ref)));
          ref = memo;
        }
      }

      this.push(pattern, ref);
      return this.nodes;
    };

    return DestructuringTransformer;
  }();

  return {
    visitor: {
      ExportNamedDeclaration: function ExportNamedDeclaration(path) {
        var declaration = path.get("declaration");
        if (!declaration.isVariableDeclaration()) return;
        if (!variableDeclarationHasPattern(declaration.node)) return;
        var specifiers = [];

        for (var name in path.getOuterBindingIdentifiers(path)) {
          specifiers.push(_core.types.exportSpecifier(_core.types.identifier(name), _core.types.identifier(name)));
        }

        path.replaceWith(declaration.node);
        path.insertAfter(_core.types.exportNamedDeclaration(null, specifiers));
      },
      ForXStatement: function ForXStatement(path) {
        var _this = this;

        var node = path.node,
            scope = path.scope;
        var left = node.left;

        if (_core.types.isPattern(left)) {
          var temp = scope.generateUidIdentifier("ref");
          node.left = _core.types.variableDeclaration("var", [_core.types.variableDeclarator(temp)]);
          path.ensureBlock();
          node.body.body.unshift(_core.types.variableDeclaration("var", [_core.types.variableDeclarator(left, temp)]));
          return;
        }

        if (!_core.types.isVariableDeclaration(left)) return;
        var pattern = left.declarations[0].id;
        if (!_core.types.isPattern(pattern)) return;
        var key = scope.generateUidIdentifier("ref");
        node.left = _core.types.variableDeclaration(left.kind, [_core.types.variableDeclarator(key, null)]);
        var nodes = [];
        var destructuring = new DestructuringTransformer({
          kind: left.kind,
          scope: scope,
          nodes: nodes,
          arrayOnlySpread: arrayOnlySpread,
          addHelper: function addHelper(name) {
            return _this.addHelper(name);
          }
        });
        destructuring.init(pattern, key);
        path.ensureBlock();
        var block = node.body;
        block.body = nodes.concat(block.body);
      },
      CatchClause: function CatchClause(_ref2) {
        var _this2 = this;

        var node = _ref2.node,
            scope = _ref2.scope;
        var pattern = node.param;
        if (!_core.types.isPattern(pattern)) return;
        var ref = scope.generateUidIdentifier("ref");
        node.param = ref;
        var nodes = [];
        var destructuring = new DestructuringTransformer({
          kind: "let",
          scope: scope,
          nodes: nodes,
          arrayOnlySpread: arrayOnlySpread,
          addHelper: function addHelper(name) {
            return _this2.addHelper(name);
          }
        });
        destructuring.init(pattern, ref);
        node.body.body = nodes.concat(node.body.body);
      },
      AssignmentExpression: function AssignmentExpression(path) {
        var _this3 = this;

        var node = path.node,
            scope = path.scope;
        if (!_core.types.isPattern(node.left)) return;
        var nodes = [];
        var destructuring = new DestructuringTransformer({
          operator: node.operator,
          scope: scope,
          nodes: nodes,
          arrayOnlySpread: arrayOnlySpread,
          addHelper: function addHelper(name) {
            return _this3.addHelper(name);
          }
        });
        var ref;

        if (path.isCompletionRecord() || !path.parentPath.isExpressionStatement()) {
          ref = scope.generateUidIdentifierBasedOnNode(node.right, "ref");
          nodes.push(_core.types.variableDeclaration("var", [_core.types.variableDeclarator(ref, node.right)]));

          if (_core.types.isArrayExpression(node.right)) {
            destructuring.arrays[ref.name] = true;
          }
        }

        destructuring.init(node.left, ref || node.right);

        if (ref) {
          nodes.push(_core.types.expressionStatement(_core.types.cloneNode(ref)));
        }

        path.replaceWithMultiple(nodes);
      },
      VariableDeclaration: function VariableDeclaration(path) {
        var _this4 = this;

        var node = path.node,
            scope = path.scope,
            parent = path.parent;
        if (_core.types.isForXStatement(parent)) return;
        if (!parent || !path.container) return;
        if (!variableDeclarationHasPattern(node)) return;
        var nodeKind = node.kind;
        var nodes = [];
        var declar;

        for (var i = 0; i < node.declarations.length; i++) {
          declar = node.declarations[i];
          var patternId = declar.init;
          var pattern = declar.id;
          var destructuring = new DestructuringTransformer({
            blockHoist: node._blockHoist,
            nodes: nodes,
            scope: scope,
            kind: node.kind,
            arrayOnlySpread: arrayOnlySpread,
            addHelper: function addHelper(name) {
              return _this4.addHelper(name);
            }
          });

          if (_core.types.isPattern(pattern)) {
            destructuring.init(pattern, patternId);

            if (+i !== node.declarations.length - 1) {
              _core.types.inherits(nodes[nodes.length - 1], declar);
            }
          } else {
            nodes.push(_core.types.inherits(destructuring.buildVariableAssignment(declar.id, _core.types.cloneNode(declar.init)), declar));
          }
        }

        var tail = null;
        var nodesOut = [];

        for (var _i5 = 0; _i5 < nodes.length; _i5++) {
          var _node = nodes[_i5];

          if (tail !== null && _core.types.isVariableDeclaration(_node)) {
            var _tail$declarations;

            (_tail$declarations = tail.declarations).push.apply(_tail$declarations, _node.declarations);
          } else {
            _node.kind = nodeKind;
            nodesOut.push(_node);
            tail = _core.types.isVariableDeclaration(_node) ? _node : null;
          }
        }

        for (var _i6 = 0; _i6 < nodesOut.length; _i6++) {
          var nodeOut = nodesOut[_i6];
          if (!nodeOut.declarations) continue;

          for (var _iterator = nodeOut.declarations, _isArray = Array.isArray(_iterator), _i7 = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref3;

            if (_isArray) {
              if (_i7 >= _iterator.length) break;
              _ref3 = _iterator[_i7++];
            } else {
              _i7 = _iterator.next();
              if (_i7.done) break;
              _ref3 = _i7.value;
            }

            var _declaration = _ref3;
            var name = _declaration.id.name;

            if (scope.bindings[name]) {
              scope.bindings[name].kind = nodeOut.kind;
            }
          }
        }

        if (nodesOut.length === 1) {
          path.replaceWith(nodesOut[0]);
        } else {
          path.replaceWithMultiple(nodesOut);
        }
      }
    }
  };
});

exports.default = _default;