"use strict";

exports.__esModule = true;
exports.default = _default;

var _convertSourceMap = _interopRequireDefault(require("convert-source-map"));

var _defaults = _interopRequireDefault(require("lodash/defaults"));

var _sourceMap = _interopRequireDefault(require("source-map"));

var _slash = _interopRequireDefault(require("slash"));

var _path = _interopRequireDefault(require("path"));

var _fs = _interopRequireDefault(require("fs"));

var util = _interopRequireWildcard(require("./util"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _default(commander, filenames, opts) {
  if (commander.sourceMaps === "inline") {
    opts.sourceMaps = true;
  }

  var results = [];

  var buildResult = function buildResult() {
    var map = new _sourceMap.default.SourceMapGenerator({
      file: commander.sourceMapTarget || _path.default.basename(commander.outFile || "") || "stdout",
      sourceRoot: opts.sourceRoot
    });
    var code = "";
    var offset = 0;
    results.forEach(function (result) {
      code += result.code + "\n";

      if (result.map) {
        var consumer = new _sourceMap.default.SourceMapConsumer(result.map);
        var sources = new Set();
        consumer.eachMapping(function (mapping) {
          if (mapping.source != null) sources.add(mapping.source);
          map.addMapping({
            generated: {
              line: mapping.generatedLine + offset,
              column: mapping.generatedColumn
            },
            source: mapping.source,
            original: mapping.source == null ? null : {
              line: mapping.originalLine,
              column: mapping.originalColumn
            }
          });
        });
        sources.forEach(function (source) {
          var content = consumer.sourceContentFor(source, true);

          if (content !== null) {
            map.setSourceContent(source, content);
          }
        });
        offset = code.split("\n").length - 1;
      }
    });

    if (commander.sourceMaps === "inline" || !commander.outFile && commander.sourceMaps) {
      code += "\n" + _convertSourceMap.default.fromObject(map).toComment();
    }

    return {
      map: map,
      code: code
    };
  };

  var output = function output() {
    var result = buildResult();

    if (commander.outFile) {
      if (commander.sourceMaps && commander.sourceMaps !== "inline") {
        var mapLoc = commander.outFile + ".map";
        result.code = util.addSourceMappingUrl(result.code, mapLoc);

        _fs.default.writeFileSync(mapLoc, JSON.stringify(result.map));
      }

      _fs.default.writeFileSync(commander.outFile, result.code);
    } else {
      process.stdout.write(result.code + "\n");
    }
  };

  var stdin = function stdin() {
    var code = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", function () {
      var chunk = process.stdin.read();
      if (chunk !== null) code += chunk;
    });
    process.stdin.on("end", function () {
      util.transform(commander.filename, code, (0, _defaults.default)({
        sourceFileName: "stdin"
      }, opts), function (err, res) {
        if (err) throw err;
        results.push(res);
        output();
      });
    });
  };

  var walk = function walk() {
    var _filenames = [];
    results = [];
    filenames.forEach(function (filename) {
      if (!_fs.default.existsSync(filename)) return;

      var stat = _fs.default.statSync(filename);

      if (stat.isDirectory()) {
        var dirname = filename;
        util.readdirForCompilable(filename, commander.includeDotfiles).forEach(function (filename) {
          _filenames.push(_path.default.join(dirname, filename));
        });
      } else {
        _filenames.push(filename);
      }
    });
    var filesProcessed = 0;

    _filenames.forEach(function (filename, index) {
      var sourceFilename = filename;

      if (commander.outFile) {
        sourceFilename = _path.default.relative(_path.default.dirname(commander.outFile), sourceFilename);
      }

      sourceFilename = (0, _slash.default)(sourceFilename);
      util.compile(filename, (0, _defaults.default)({
        sourceFileName: sourceFilename
      }, opts), function (err, res) {
        if (err) throw err;
        filesProcessed++;
        if (res) results[index] = res;

        if (filesProcessed === _filenames.length) {
          output();
        }
      });
    });
  };

  var files = function files() {
    if (!commander.skipInitialBuild) {
      walk();
    }

    if (commander.watch) {
      var chokidar = util.requireChokidar();
      chokidar.watch(filenames, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 10
        }
      }).on("all", function (type, filename) {
        if (!util.isCompilableExtension(filename, commander.extensions)) {
          return;
        }

        if (type === "add" || type === "change") {
          util.log(type + " " + filename);

          try {
            walk();
          } catch (err) {
            console.error(err.stack);
          }
        }
      });
    }
  };

  if (filenames.length) {
    files();
  } else {
    stdin();
  }
}