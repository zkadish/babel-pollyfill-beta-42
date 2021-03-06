"use strict";

exports.__esModule = true;
exports.default = loadPrivatePartialConfig;
exports.loadPartialConfig = loadPartialConfig;

var _path = _interopRequireDefault(require("path"));

var _plugin = _interopRequireDefault(require("./plugin"));

var _util = require("./util");

var _item = require("./item");

var _configChain = require("./config-chain");

var _environment = require("./helpers/environment");

var _options = require("./validation/options");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function loadPrivatePartialConfig(inputOpts) {
  if (inputOpts != null && (typeof inputOpts !== "object" || Array.isArray(inputOpts))) {
    throw new Error("Babel options must be an object, null, or undefined");
  }

  var args = inputOpts ? (0, _options.validate)("arguments", inputOpts) : {};
  var _args$envName = args.envName,
      envName = _args$envName === void 0 ? (0, _environment.getEnv)() : _args$envName,
      _args$cwd = args.cwd,
      cwd = _args$cwd === void 0 ? "." : _args$cwd;

  var absoluteCwd = _path.default.resolve(cwd);

  var context = {
    filename: args.filename ? _path.default.resolve(cwd, args.filename) : null,
    cwd: absoluteCwd,
    envName: envName
  };
  var configChain = (0, _configChain.buildRootChain)(args, context);
  if (!configChain) return null;
  var options = {};
  configChain.options.forEach(function (opts) {
    (0, _util.mergeOptions)(options, opts);
  });
  options.babelrc = false;
  options.envName = envName;
  options.cwd = absoluteCwd;
  options.passPerPreset = false;
  options.plugins = configChain.plugins.map(function (descriptor) {
    return (0, _item.createItemFromDescriptor)(descriptor);
  });
  options.presets = configChain.presets.map(function (descriptor) {
    return (0, _item.createItemFromDescriptor)(descriptor);
  });
  return {
    options: options,
    context: context,
    ignore: configChain.ignore,
    babelrc: configChain.babelrc
  };
}

function loadPartialConfig(inputOpts) {
  var result = loadPrivatePartialConfig(inputOpts);
  if (!result) return null;
  var options = result.options,
      babelrc = result.babelrc,
      ignore = result.ignore;
  (options.plugins || []).forEach(function (item) {
    if (item.value instanceof _plugin.default) {
      throw new Error("Passing cached plugin instances is not supported in " + "babel.loadPartialConfig()");
    }
  });
  return new PartialConfig(options, babelrc ? babelrc.filepath : undefined, ignore ? ignore.filepath : undefined);
}

var PartialConfig = function () {
  function PartialConfig(options, babelrc, ignore) {
    this.options = options;
    this.babelignore = ignore;
    this.babelrc = babelrc;
    Object.freeze(this);
  }

  var _proto = PartialConfig.prototype;

  _proto.hasFilesystemConfig = function hasFilesystemConfig() {
    return this.babelrc !== undefined;
  };

  return PartialConfig;
}();

Object.freeze(PartialConfig.prototype);