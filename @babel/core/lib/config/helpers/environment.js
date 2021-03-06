"use strict";

exports.__esModule = true;
exports.getEnv = getEnv;

function getEnv(defaultValue) {
  if (defaultValue === void 0) {
    defaultValue = "development";
  }

  return process.env.BABEL_ENV || process.env.NODE_ENV || defaultValue;
}