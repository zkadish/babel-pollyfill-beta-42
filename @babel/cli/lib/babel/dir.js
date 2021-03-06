"use strict";

exports.__esModule = true;
exports.default = _default;

var _defaults = _interopRequireDefault(require("lodash/defaults"));

var _outputFileSync = _interopRequireDefault(require("output-file-sync"));

var _slash = _interopRequireDefault(require("slash"));

var _path = _interopRequireDefault(require("path"));

var _fs = _interopRequireDefault(require("fs"));

var util = _interopRequireWildcard(require("./util"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var compiledFiles = 0;

function _default(commander, filenames, opts) {
  function write(src, relative, base, callback) {
    if (typeof base === "function") {
      callback = base;
      base = undefined;
    }

    if (!util.isCompilableExtension(relative, commander.extensions)) {
      return process.nextTick(callback);
    }

    relative = util.adjustRelative(relative, commander.keepFileExtension);
    var dest = getDest(commander, relative, base);
    util.compile(src, (0, _defaults.default)({
      sourceFileName: (0, _slash.default)(_path.default.relative(dest + "/..", src))
    }, opts), function (err, res) {
      if (err) return callback(err);
      if (!res) return callback();

      if (res.map && commander.sourceMaps && commander.sourceMaps !== "inline") {
        var mapLoc = dest + ".map";
        res.code = util.addSourceMappingUrl(res.code, mapLoc);
        res.map.file = _path.default.basename(relative);
        (0, _outputFileSync.default)(mapLoc, JSON.stringify(res.map));
      }

      (0, _outputFileSync.default)(dest, res.code);
      util.chmod(src, dest);
      compiledFiles += 1;
      util.log(src + " -> " + dest);
      return callback(null, true);
    });
  }

  function getDest(commander, filename, base) {
    if (commander.relative) return _path.default.join(base, commander.outDir, filename);
    return _path.default.join(commander.outDir, filename);
  }

  function outputDestFolder(outDir) {
    var outDirPath = _path.default.resolve(outDir);

    if (!_fs.default.existsSync(outDirPath)) {
      _fs.default.mkdirSync(outDirPath);
    }
  }

  function handleFile(src, filename, base, callback) {
    if (typeof base === "function") {
      callback = base;
      base = undefined;
    }

    write(src, filename, base, function (err, res) {
      if (err) return callback(err);

      if (!res && commander.copyFiles) {
        var dest = getDest(commander, filename, base);
        (0, _outputFileSync.default)(dest, _fs.default.readFileSync(src));
        util.chmod(src, dest);
      }

      return callback();
    });
  }

  function sequentialHandleFile(files, dirname, index, callback) {
    if (files.length === 0) {
      outputDestFolder(commander.outDir);
      return;
    }

    if (typeof index === "function") {
      callback = index;
      index = 0;
    }

    var filename = files[index];

    var src = _path.default.join(dirname, filename);

    handleFile(src, filename, dirname, function (err) {
      if (err) return callback(err);
      index++;

      if (index !== files.length) {
        sequentialHandleFile(files, dirname, index, callback);
      } else {
        callback();
      }
    });
  }

  function handle(filename, callback) {
    if (!_fs.default.existsSync(filename)) return;

    var stat = _fs.default.statSync(filename);

    if (stat.isDirectory(filename)) {
      var dirname = filename;

      if (commander.deleteDirOnStart) {
        util.deleteDir(commander.outDir);
      }

      var files = util.readdir(dirname, commander.includeDotfiles);
      sequentialHandleFile(files, dirname, callback);
    } else {
      write(filename, _path.default.basename(filename), _path.default.dirname(filename), callback);
    }
  }

  function sequentialHandle(filenames, index) {
    if (index === void 0) {
      index = 0;
    }

    var filename = filenames[index];
    handle(filename, function (err) {
      if (err) throw new Error(err);
      index++;

      if (index !== filenames.length) {
        sequentialHandle(filenames, index);
      } else {
        util.log("\uD83C\uDF89  Successfully compiled " + compiledFiles + " " + (compiledFiles > 1 ? "files" : "file") + " with Babel.", true);
      }
    });
  }

  if (!commander.skipInitialBuild) {
    sequentialHandle(filenames);
  }

  if (commander.watch) {
    var chokidar = util.requireChokidar();
    filenames.forEach(function (dirname) {
      var watcher = chokidar.watch(dirname, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 10
        }
      });
      ["add", "change"].forEach(function (type) {
        watcher.on(type, function (filename) {
          var relative = _path.default.relative(dirname, filename) || filename;

          try {
            handleFile(filename, relative, function (err) {
              if (err) throw err;
            });
          } catch (err) {
            console.error(err.stack);
          }
        });
      });
    });
  }
}