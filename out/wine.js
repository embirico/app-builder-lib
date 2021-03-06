"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.execWine = execWine;
exports.prepareWindowsExecutableArgs = prepareWindowsExecutableArgs;
exports.checkWineVersion = void 0;

function _bluebirdLst() {
  const data = require("bluebird-lst");

  _bluebirdLst = function () {
    return data;
  };

  return data;
}

function _zipBin() {
  const data = require("7zip-bin");

  _zipBin = function () {
    return data;
  };

  return data;
}

function _lazyVal() {
  const data = require("lazy-val");

  _lazyVal = function () {
    return data;
  };

  return data;
}

function os() {
  const data = _interopRequireWildcard(require("os"));

  os = function () {
    return data;
  };

  return data;
}

var path = _interopRequireWildcard(require("path"));

function semver() {
  const data = _interopRequireWildcard(require("semver"));

  semver = function () {
    return data;
  };

  return data;
}

function _binDownload() {
  const data = require("./binDownload");

  _binDownload = function () {
    return data;
  };

  return data;
}

function _bundledTool() {
  const data = require("builder-util/out/bundledTool");

  _bundledTool = function () {
    return data;
  };

  return data;
}

function _macosVersion() {
  const data = require("builder-util/out/macosVersion");

  _macosVersion = function () {
    return data;
  };

  return data;
}

function _util() {
  const data = require("builder-util/out/util");

  _util = function () {
    return data;
  };

  return data;
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

const wineExecutable = new (_lazyVal().Lazy)((0, _bluebirdLst().coroutine)(function* () {
  const isUseSystemWine = (0, _util().isEnvTrue)(process.env.USE_SYSTEM_WINE);

  if (isUseSystemWine) {
    _util().log.debug(null, "using system wine is forced");
  } else if (process.platform === "darwin") {
    // assume that on travis latest version is used
    const osVersion = yield (0, _macosVersion().getMacOsVersion)();
    let version = null;
    let checksum = null;

    if (semver().gte(osVersion, "10.13.0")) {
      version = "2.0.3-mac-10.13"; // noinspection SpellCheckingInspection

      checksum = "dlEVCf0YKP5IEiOKPNE48Q8NKXbXVdhuaI9hG2oyDEay2c+93PE5qls7XUbIYq4Xi1gRK8fkWeCtzN2oLpVQtg==";
    } else if (semver().gte(osVersion, "10.12.0") || process.env.TRAVIS_OS_NAME === "osx") {
      version = "2.0.1-mac-10.12"; // noinspection SpellCheckingInspection

      checksum = "IvKwDml/Ob0vKfYVxcu92wxUzHu8lTQSjjb8OlCTQ6bdNpVkqw17OM14TPpzGMIgSxfVIrQZhZdCwpkxLyG3mg==";
    }

    if (version != null) {
      const wineDir = yield (0, _binDownload().getBinFromGithub)("wine", version, checksum);
      return {
        path: path.join(wineDir, "bin/wine"),
        env: Object.assign({}, process.env, {
          WINEDEBUG: "-all,err+all",
          WINEDLLOVERRIDES: "winemenubuilder.exe=d",
          WINEPREFIX: path.join(wineDir, "wine-home"),
          DYLD_FALLBACK_LIBRARY_PATH: (0, _bundledTool().computeEnv)(process.env.DYLD_FALLBACK_LIBRARY_PATH, [path.join(wineDir, "lib")])
        })
      };
    }
  }

  if (process.env.COMPRESSED_WINE_HOME) {
    yield (0, _util().exec)(_zipBin().path7za, (0, _util().debug7zArgs)("x").concat(process.env.COMPRESSED_WINE_HOME, "-aoa", `-o${path.join(os().homedir(), ".wine")}`));
  } else {
    yield checkWineVersion((0, _util().exec)("wine", ["--version"]));
  }

  return {
    path: "wine"
  };
}));
/** @private */

function execWine(file, args, options = _bundledTool().EXEC_TIMEOUT) {
  if (process.platform === "win32") {
    return (0, _util().exec)(file, args, options);
  } else {
    return wineExecutable.value.then(wine => {
      const effectiveOptions = wine.env == null ? options : Object.assign({}, options);

      if (wine.env != null) {
        effectiveOptions.env = options.env == null ? wine.env : Object.assign({}, options.env, wine.env);
      }

      return (0, _util().exec)(wine.path, [file].concat(args), effectiveOptions);
    });
  }
}
/** @private */


function prepareWindowsExecutableArgs(args, exePath) {
  if (process.platform !== "win32") {
    args.unshift(exePath);
  }

  return args;
}
/** @private */


let checkWineVersion = (() => {
  var _ref2 = (0, _bluebirdLst().coroutine)(function* (checkPromise) {
    function wineError(prefix) {
      return `${prefix}, please see https://electron.build/multi-platform-build#${process.platform === "linux" ? "linux" : "macos"}`;
    }

    let wineVersion;

    try {
      wineVersion = (yield checkPromise).trim();
    } catch (e) {
      if (e.code === "ENOENT") {
        throw new Error(wineError("wine is required"));
      } else {
        throw new Error(`Cannot check wine version: ${e}`);
      }
    }

    if (wineVersion.startsWith("wine-")) {
      wineVersion = wineVersion.substring("wine-".length);
    }

    const spaceIndex = wineVersion.indexOf(" ");

    if (spaceIndex > 0) {
      wineVersion = wineVersion.substring(0, spaceIndex);
    }

    const suffixIndex = wineVersion.indexOf("-");

    if (suffixIndex > 0) {
      wineVersion = wineVersion.substring(0, suffixIndex);
    }

    if (wineVersion.split(".").length === 2) {
      wineVersion += ".0";
    }

    if (semver().lt(wineVersion, "1.8.0")) {
      throw new Error(wineError(`wine 1.8+ is required, but your version is ${wineVersion}`));
    }
  });

  return function checkWineVersion(_x) {
    return _ref2.apply(this, arguments);
  };
})(); exports.checkWineVersion = checkWineVersion;
//# sourceMappingURL=wine.js.map