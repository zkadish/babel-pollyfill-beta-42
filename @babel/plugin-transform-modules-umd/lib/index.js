"use strict";

exports.__esModule = true;
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

var _path = require("path");

var _helperModuleTransforms = require("@babel/helper-module-transforms");

var _core = require("@babel/core");

var buildPrerequisiteAssignment = (0, _core.template)("\n  GLOBAL_REFERENCE = GLOBAL_REFERENCE || {}\n");
var buildWrapper = (0, _core.template)("\n  (function (global, factory) {\n    if (typeof define === \"function\" && define.amd) {\n      define(MODULE_NAME, AMD_ARGUMENTS, factory);\n    } else if (typeof exports !== \"undefined\") {\n      factory(COMMONJS_ARGUMENTS);\n    } else {\n      var mod = { exports: {} };\n      factory(BROWSER_ARGUMENTS);\n\n      GLOBAL_TO_ASSIGN;\n    }\n  })(this, function(IMPORT_NAMES) {\n  })\n");

var _default = (0, _helperPluginUtils.declare)(function (api, options) {
  api.assertVersion(7);
  var globals = options.globals,
      exactGlobals = options.exactGlobals,
      loose = options.loose,
      allowTopLevelThis = options.allowTopLevelThis,
      strict = options.strict,
      strictMode = options.strictMode,
      noInterop = options.noInterop;

  function buildBrowserInit(browserGlobals, exactGlobals, filename, moduleName) {
    var moduleNameOrBasename = moduleName ? moduleName.value : (0, _path.basename)(filename, (0, _path.extname)(filename));

    var globalToAssign = _core.types.memberExpression(_core.types.identifier("global"), _core.types.identifier(_core.types.toIdentifier(moduleNameOrBasename)));

    var initAssignments = [];

    if (exactGlobals) {
      var globalName = browserGlobals[moduleNameOrBasename];

      if (globalName) {
        initAssignments = [];
        var members = globalName.split(".");
        globalToAssign = members.slice(1).reduce(function (accum, curr) {
          initAssignments.push(buildPrerequisiteAssignment({
            GLOBAL_REFERENCE: _core.types.cloneNode(accum)
          }));
          return _core.types.memberExpression(accum, _core.types.identifier(curr));
        }, _core.types.memberExpression(_core.types.identifier("global"), _core.types.identifier(members[0])));
      }
    }

    initAssignments.push(_core.types.expressionStatement(_core.types.assignmentExpression("=", globalToAssign, _core.types.memberExpression(_core.types.identifier("mod"), _core.types.identifier("exports")))));
    return initAssignments;
  }

  function buildBrowserArg(browserGlobals, exactGlobals, source) {
    var memberExpression;

    if (exactGlobals) {
      var globalRef = browserGlobals[source];

      if (globalRef) {
        memberExpression = globalRef.split(".").reduce(function (accum, curr) {
          return _core.types.memberExpression(accum, _core.types.identifier(curr));
        }, _core.types.identifier("global"));
      } else {
        memberExpression = _core.types.memberExpression(_core.types.identifier("global"), _core.types.identifier(_core.types.toIdentifier(source)));
      }
    } else {
      var requireName = (0, _path.basename)(source, (0, _path.extname)(source));
      var globalName = browserGlobals[requireName] || requireName;
      memberExpression = _core.types.memberExpression(_core.types.identifier("global"), _core.types.identifier(_core.types.toIdentifier(globalName)));
    }

    return memberExpression;
  }

  return {
    visitor: {
      Program: {
        exit: function exit(path) {
          if (!(0, _helperModuleTransforms.isModule)(path)) return;
          var browserGlobals = globals || {};
          var moduleName = this.getModuleName();
          if (moduleName) moduleName = _core.types.stringLiteral(moduleName);

          var _rewriteModuleStateme = (0, _helperModuleTransforms.rewriteModuleStatementsAndPrepareHeader)(path, {
            loose: loose,
            strict: strict,
            strictMode: strictMode,
            allowTopLevelThis: allowTopLevelThis,
            noInterop: noInterop
          }),
              meta = _rewriteModuleStateme.meta,
              headers = _rewriteModuleStateme.headers;

          var amdArgs = [];
          var commonjsArgs = [];
          var browserArgs = [];
          var importNames = [];

          if ((0, _helperModuleTransforms.hasExports)(meta)) {
            amdArgs.push(_core.types.stringLiteral("exports"));
            commonjsArgs.push(_core.types.identifier("exports"));
            browserArgs.push(_core.types.memberExpression(_core.types.identifier("mod"), _core.types.identifier("exports")));
            importNames.push(_core.types.identifier(meta.exportName));
          }

          for (var _iterator = meta.source, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref2;

            if (_isArray) {
              if (_i >= _iterator.length) break;
              _ref2 = _iterator[_i++];
            } else {
              _i = _iterator.next();
              if (_i.done) break;
              _ref2 = _i.value;
            }

            var _ref3 = _ref2;
            var _source = _ref3[0];
            var _metadata = _ref3[1];
            amdArgs.push(_core.types.stringLiteral(_source));
            commonjsArgs.push(_core.types.callExpression(_core.types.identifier("require"), [_core.types.stringLiteral(_source)]));
            browserArgs.push(buildBrowserArg(browserGlobals, exactGlobals, _source));
            importNames.push(_core.types.identifier(_metadata.name));

            if (!(0, _helperModuleTransforms.isSideEffectImport)(_metadata)) {
              var interop = (0, _helperModuleTransforms.wrapInterop)(path, _core.types.identifier(_metadata.name), _metadata.interop);

              if (interop) {
                var header = _core.types.expressionStatement(_core.types.assignmentExpression("=", _core.types.identifier(_metadata.name), interop));

                header.loc = meta.loc;
                headers.push(header);
              }
            }

            headers.push.apply(headers, (0, _helperModuleTransforms.buildNamespaceInitStatements)(meta, _metadata, loose));
          }

          (0, _helperModuleTransforms.ensureStatementsHoisted)(headers);
          path.unshiftContainer("body", headers);
          var _path$node = path.node,
              body = _path$node.body,
              directives = _path$node.directives;
          path.node.directives = [];
          path.node.body = [];
          var umdWrapper = path.pushContainer("body", [buildWrapper({
            MODULE_NAME: moduleName,
            AMD_ARGUMENTS: _core.types.arrayExpression(amdArgs),
            COMMONJS_ARGUMENTS: commonjsArgs,
            BROWSER_ARGUMENTS: browserArgs,
            IMPORT_NAMES: importNames,
            GLOBAL_TO_ASSIGN: buildBrowserInit(browserGlobals, exactGlobals, this.filename || "unknown", moduleName)
          })])[0];
          var umdFactory = umdWrapper.get("expression.arguments")[1].get("body");
          umdFactory.pushContainer("directives", directives);
          umdFactory.pushContainer("body", body);
        }
      }
    }
  };
});

exports.default = _default;