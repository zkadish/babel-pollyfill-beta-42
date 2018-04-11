"use strict";

exports.__esModule = true;
exports.buildRootChain = buildRootChain;
exports.buildPresetChain = void 0;

var _path = _interopRequireDefault(require("path"));

var _micromatch = _interopRequireDefault(require("micromatch"));

var _debug = _interopRequireDefault(require("debug"));

var _options = require("./validation/options");

var _files = require("./files");

var _caching = require("./caching");

var _configDescriptors = require("./config-descriptors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug.default)("babel:config:config-chain");
var buildPresetChain = makeChainWalker({
  init: function init(arg) {
    return arg;
  },
  root: function root(preset) {
    return loadPresetDescriptors(preset);
  },
  env: function env(preset, envName) {
    return loadPresetEnvDescriptors(preset)(envName);
  },
  overrides: function overrides(preset, index) {
    return loadPresetOverridesDescriptors(preset)(index);
  },
  overridesEnv: function overridesEnv(preset, index, envName) {
    return loadPresetOverridesEnvDescriptors(preset)(index)(envName);
  }
});
exports.buildPresetChain = buildPresetChain;
var loadPresetDescriptors = (0, _caching.makeWeakCache)(function (preset) {
  return buildRootDescriptors(preset, preset.alias, _configDescriptors.createUncachedDescriptors);
});
var loadPresetEnvDescriptors = (0, _caching.makeWeakCache)(function (preset) {
  return (0, _caching.makeStrongCache)(function (envName) {
    return buildEnvDescriptors(preset, preset.alias, _configDescriptors.createUncachedDescriptors, envName);
  });
});
var loadPresetOverridesDescriptors = (0, _caching.makeWeakCache)(function (preset) {
  return (0, _caching.makeStrongCache)(function (index) {
    return buildOverrideDescriptors(preset, preset.alias, _configDescriptors.createUncachedDescriptors, index);
  });
});
var loadPresetOverridesEnvDescriptors = (0, _caching.makeWeakCache)(function (preset) {
  return (0, _caching.makeStrongCache)(function (index) {
    return (0, _caching.makeStrongCache)(function (envName) {
      return buildOverrideEnvDescriptors(preset, preset.alias, _configDescriptors.createUncachedDescriptors, index, envName);
    });
  });
});

function buildRootChain(opts, context) {
  var programmaticChain = loadProgrammaticChain({
    options: opts,
    dirname: context.cwd
  }, context);
  if (!programmaticChain) return null;
  var ignore, babelrc;
  var fileChain = emptyChain();

  if (opts.babelrc !== false && context.filename !== null) {
    var _filename = context.filename;

    var _findRelativeConfig = (0, _files.findRelativeConfig)(_filename, context.envName);

    ignore = _findRelativeConfig.ignore;
    babelrc = _findRelativeConfig.config;

    if (ignore && shouldIgnore(context, ignore.ignore, null, ignore.dirname)) {
      return null;
    }

    if (babelrc) {
      var result = loadFileChain(babelrc, context);
      if (!result) return null;
      mergeChain(fileChain, result);
    }
  }

  var chain = mergeChain(mergeChain(emptyChain(), fileChain), programmaticChain);
  return {
    plugins: dedupDescriptors(chain.plugins),
    presets: dedupDescriptors(chain.presets),
    options: chain.options.map(function (o) {
      return normalizeOptions(o);
    }),
    ignore: ignore || undefined,
    babelrc: babelrc || undefined
  };
}

var loadProgrammaticChain = makeChainWalker({
  init: function init(arg) {
    return arg;
  },
  root: function root(input) {
    return buildRootDescriptors(input, "base", _configDescriptors.createCachedDescriptors);
  },
  env: function env(input, envName) {
    return buildEnvDescriptors(input, "base", _configDescriptors.createCachedDescriptors, envName);
  },
  overrides: function overrides(input, index) {
    return buildOverrideDescriptors(input, "base", _configDescriptors.createCachedDescriptors, index);
  },
  overridesEnv: function overridesEnv(input, index, envName) {
    return buildOverrideEnvDescriptors(input, "base", _configDescriptors.createCachedDescriptors, index, envName);
  }
});
var loadFileChain = makeChainWalker({
  init: function init(input) {
    return validateFile(input);
  },
  root: function root(file) {
    return loadFileDescriptors(file);
  },
  env: function env(file, envName) {
    return loadFileEnvDescriptors(file)(envName);
  },
  overrides: function overrides(file, index) {
    return loadFileOverridesDescriptors(file)(index);
  },
  overridesEnv: function overridesEnv(file, index, envName) {
    return loadFileOverridesEnvDescriptors(file)(index)(envName);
  }
});
var validateFile = (0, _caching.makeWeakCache)(function (file) {
  return {
    filepath: file.filepath,
    dirname: file.dirname,
    options: (0, _options.validate)("file", file.options)
  };
});
var loadFileDescriptors = (0, _caching.makeWeakCache)(function (file) {
  return buildRootDescriptors(file, file.filepath, _configDescriptors.createUncachedDescriptors);
});
var loadFileEnvDescriptors = (0, _caching.makeWeakCache)(function (file) {
  return (0, _caching.makeStrongCache)(function (envName) {
    return buildEnvDescriptors(file, file.filepath, _configDescriptors.createUncachedDescriptors, envName);
  });
});
var loadFileOverridesDescriptors = (0, _caching.makeWeakCache)(function (file) {
  return (0, _caching.makeStrongCache)(function (index) {
    return buildOverrideDescriptors(file, file.filepath, _configDescriptors.createUncachedDescriptors, index);
  });
});
var loadFileOverridesEnvDescriptors = (0, _caching.makeWeakCache)(function (file) {
  return (0, _caching.makeStrongCache)(function (index) {
    return (0, _caching.makeStrongCache)(function (envName) {
      return buildOverrideEnvDescriptors(file, file.filepath, _configDescriptors.createUncachedDescriptors, index, envName);
    });
  });
});

function buildRootDescriptors(_ref, alias, descriptors) {
  var dirname = _ref.dirname,
      options = _ref.options;
  return descriptors(dirname, options, alias);
}

function buildEnvDescriptors(_ref2, alias, descriptors, envName) {
  var dirname = _ref2.dirname,
      options = _ref2.options;
  var opts = options.env && options.env[envName];
  return opts ? descriptors(dirname, opts, alias + ".env[\"" + envName + "\"]") : null;
}

function buildOverrideDescriptors(_ref3, alias, descriptors, index) {
  var dirname = _ref3.dirname,
      options = _ref3.options;
  var opts = options.overrides && options.overrides[index];
  if (!opts) throw new Error("Assertion failure - missing override");
  return descriptors(dirname, opts, alias + ".overrides[" + index + "]");
}

function buildOverrideEnvDescriptors(_ref4, alias, descriptors, index, envName) {
  var dirname = _ref4.dirname,
      options = _ref4.options;
  var override = options.overrides && options.overrides[index];
  if (!override) throw new Error("Assertion failure - missing override");
  var opts = override.env && override.env[envName];
  return opts ? descriptors(dirname, opts, alias + ".overrides[" + index + "].env[\"" + envName + "\"]") : null;
}

function makeChainWalker(_ref5) {
  var init = _ref5.init,
      root = _ref5.root,
      env = _ref5.env,
      overrides = _ref5.overrides,
      overridesEnv = _ref5.overridesEnv;
  return function (arg, context, files) {
    if (files === void 0) {
      files = new Set();
    }

    var input = init(arg);
    var dirname = input.dirname;
    var flattenedConfigs = [];
    var rootOpts = root(input);

    if (configIsApplicable(rootOpts, dirname, context)) {
      flattenedConfigs.push(rootOpts);
      var envOpts = env(input, context.envName);

      if (envOpts && configIsApplicable(envOpts, dirname, context)) {
        flattenedConfigs.push(envOpts);
      }

      (rootOpts.options.overrides || []).forEach(function (_, index) {
        var overrideOps = overrides(input, index);

        if (configIsApplicable(overrideOps, dirname, context)) {
          flattenedConfigs.push(overrideOps);
          var overrideEnvOpts = overridesEnv(input, index, context.envName);

          if (overrideEnvOpts && configIsApplicable(overrideEnvOpts, dirname, context)) {
            flattenedConfigs.push(overrideEnvOpts);
          }
        }
      });
    }

    if (flattenedConfigs.some(function (_ref6) {
      var _ref6$options = _ref6.options,
          ignore = _ref6$options.ignore,
          only = _ref6$options.only;
      return shouldIgnore(context, ignore, only, dirname);
    })) {
      return null;
    }

    var chain = emptyChain();

    for (var _i = 0; _i < flattenedConfigs.length; _i++) {
      var op = flattenedConfigs[_i];

      if (!mergeExtendsChain(chain, op.options, dirname, context, files)) {
        return null;
      }

      mergeChainOpts(chain, op);
    }

    return chain;
  };
}

function mergeExtendsChain(chain, opts, dirname, context, files) {
  if (opts.extends === undefined) return true;
  var file = (0, _files.loadConfig)(opts.extends, dirname, context.envName);

  if (files.has(file)) {
    throw new Error("Configuration cycle detected loading " + file.filepath + ".\n" + "File already loaded following the config chain:\n" + Array.from(files, function (file) {
      return " - " + file.filepath;
    }).join("\n"));
  }

  files.add(file);
  var fileChain = loadFileChain(file, context, files);
  files.delete(file);
  if (!fileChain) return false;
  mergeChain(chain, fileChain);
  return true;
}

function mergeChain(target, source) {
  var _target$options, _target$plugins, _target$presets;

  (_target$options = target.options).push.apply(_target$options, source.options);

  (_target$plugins = target.plugins).push.apply(_target$plugins, source.plugins);

  (_target$presets = target.presets).push.apply(_target$presets, source.presets);

  return target;
}

function mergeChainOpts(target, _ref7) {
  var _target$plugins2, _target$presets2;

  var options = _ref7.options,
      plugins = _ref7.plugins,
      presets = _ref7.presets;
  target.options.push(options);

  (_target$plugins2 = target.plugins).push.apply(_target$plugins2, plugins());

  (_target$presets2 = target.presets).push.apply(_target$presets2, presets());

  return target;
}

function emptyChain() {
  return {
    options: [],
    presets: [],
    plugins: []
  };
}

function normalizeOptions(opts) {
  var options = Object.assign({}, opts);
  delete options.extends;
  delete options.env;
  delete options.plugins;
  delete options.presets;
  delete options.passPerPreset;
  delete options.ignore;
  delete options.only;

  if (options.sourceMap) {
    options.sourceMaps = options.sourceMap;
    delete options.sourceMap;
  }

  return options;
}

function dedupDescriptors(items) {
  var map = new Map();
  var descriptors = [];

  for (var _iterator = items, _isArray = Array.isArray(_iterator), _i2 = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
    var _ref8;

    if (_isArray) {
      if (_i2 >= _iterator.length) break;
      _ref8 = _iterator[_i2++];
    } else {
      _i2 = _iterator.next();
      if (_i2.done) break;
      _ref8 = _i2.value;
    }

    var _item = _ref8;

    if (typeof _item.value === "function") {
      var fnKey = _item.value;
      var nameMap = map.get(fnKey);

      if (!nameMap) {
        nameMap = new Map();
        map.set(fnKey, nameMap);
      }

      var desc = nameMap.get(_item.name);

      if (!desc) {
        desc = {
          value: null
        };
        descriptors.push(desc);
        if (!_item.ownPass) nameMap.set(_item.name, desc);
      }

      if (_item.options === false) {
        desc.value = null;
      } else {
        desc.value = _item;
      }
    } else {
      descriptors.push({
        value: _item
      });
    }
  }

  return descriptors.reduce(function (acc, desc) {
    if (desc.value) acc.push(desc.value);
    return acc;
  }, []);
}

function configIsApplicable(_ref9, dirname, context) {
  var options = _ref9.options;
  return (options.test === undefined || configFieldIsApplicable(context, options.test, dirname)) && (options.include === undefined || configFieldIsApplicable(context, options.include, dirname)) && (options.exclude === undefined || !configFieldIsApplicable(context, options.exclude, dirname));
}

function configFieldIsApplicable(context, test, dirname) {
  if (context.filename === null) {
    throw new Error("Configuration contains explicit test/include/exclude checks, but no filename was passed to Babel");
  }

  var ctx = context;
  var patterns = Array.isArray(test) ? test : [test];
  return matchesPatterns(ctx, patterns, dirname, false);
}

function shouldIgnore(context, ignore, only, dirname) {
  if (ignore) {
    if (context.filename === null) {
      throw new Error("Configuration contains ignore checks, but no filename was passed to Babel");
    }

    var ctx = context;

    if (matchesPatterns(ctx, ignore, dirname)) {
      debug("Ignored %o because it matched one of %O from %o", context.filename, ignore, dirname);
      return true;
    }
  }

  if (only) {
    if (context.filename === null) {
      throw new Error("Configuration contains ignore checks, but no filename was passed to Babel");
    }

    var _ctx = context;

    if (!matchesPatterns(_ctx, only, dirname)) {
      debug("Ignored %o because it failed to match one of %O from %o", context.filename, only, dirname);
      return true;
    }
  }

  return false;
}

function matchesPatterns(context, patterns, dirname, allowNegation) {
  if (allowNegation === void 0) {
    allowNegation = true;
  }

  var res = [];
  var strings = [];
  var fns = [];
  patterns.forEach(function (pattern) {
    if (typeof pattern === "string") strings.push(pattern);else if (typeof pattern === "function") fns.push(pattern);else res.push(pattern);
  });
  var filename = context.filename;
  if (res.some(function (re) {
    return re.test(context.filename);
  })) return true;
  if (fns.some(function (fn) {
    return fn(filename);
  })) return true;

  if (strings.length > 0) {
    var possibleDirs = getPossibleDirs(context);
    var absolutePatterns = strings.map(function (pattern) {
      var negate = pattern[0] === "!";

      if (negate && !allowNegation) {
        throw new Error("Negation of file paths is not supported.");
      }

      if (negate) pattern = pattern.slice(1);
      return (negate ? "!" : "") + _path.default.resolve(dirname, pattern);
    });

    if ((0, _micromatch.default)(possibleDirs, absolutePatterns, {
      nocase: true,
      nonegate: !allowNegation
    }).length > 0) {
      return true;
    }
  }

  return false;
}

var getPossibleDirs = (0, _caching.makeWeakCache)(function (context) {
  var current = context.filename;
  if (current === null) return [];
  var possibleDirs = [current];

  while (true) {
    var previous = current;
    current = _path.default.dirname(current);
    if (previous === current) break;
    possibleDirs.push(current);
  }

  return possibleDirs;
});