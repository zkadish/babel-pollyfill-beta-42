"use strict";

exports.__esModule = true;
exports.logUsagePolyfills = exports.logEntryPolyfills = exports.logPlugin = exports.logMessage = void 0;

var _semver = _interopRequireDefault(require("semver"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var wordEnds = function wordEnds(size) {
  return size > 1 ? "s" : "";
};

var logMessage = function logMessage(message, context) {
  var pre = context ? "[" + context + "] " : "";
  var logStr = "  " + pre + message;
  console.log(logStr);
};

exports.logMessage = logMessage;

var logPlugin = function logPlugin(item, targetVersions, list, context) {
  var minVersions = list[item] || {};
  var filteredList = Object.keys(targetVersions).reduce(function (result, env) {
    var minVersion = minVersions[env];
    var targetVersion = targetVersions[env];

    if (!minVersion) {
      result[env] = (0, _utils.prettifyVersion)(targetVersion);
    } else {
      var minIsUnreleased = (0, _utils.isUnreleasedVersion)(minVersion, env);
      var targetIsUnreleased = (0, _utils.isUnreleasedVersion)(targetVersion, env);

      if (!targetIsUnreleased && (minIsUnreleased || _semver.default.lt(targetVersion, (0, _utils.semverify)(minVersion)))) {
        result[env] = (0, _utils.prettifyVersion)(targetVersion);
      }
    }

    return result;
  }, {});
  var formattedTargets = JSON.stringify(filteredList).replace(/,/g, ", ").replace(/^\{"/, '{ "').replace(/"\}$/, '" }');
  logMessage(item + " " + formattedTargets, context);
};

exports.logPlugin = logPlugin;

var logEntryPolyfills = function logEntryPolyfills(importPolyfillIncluded, polyfills, filename, onDebug) {
  if (!importPolyfillIncluded) {
    console.log("\n[" + filename + "] `import '@babel/polyfill'` was not found.");
    return;
  }

  if (!polyfills.size) {
    console.log("\n[" + filename + "] Based on your targets, none were added.");
    return;
  }

  console.log("\n[" + filename + "] Replaced `@babel/polyfill` with the following polyfill" + wordEnds(polyfills.size) + ":");
  onDebug(polyfills);
};

exports.logEntryPolyfills = logEntryPolyfills;

var logUsagePolyfills = function logUsagePolyfills(polyfills, filename, onDebug) {
  if (!polyfills.size) {
    console.log("\n[" + filename + "] Based on your code and targets, none were added.");
    return;
  }

  console.log("\n[" + filename + "] Added following polyfill" + wordEnds(polyfills.size) + ":");
  onDebug(polyfills);
};

exports.logUsagePolyfills = logUsagePolyfills;