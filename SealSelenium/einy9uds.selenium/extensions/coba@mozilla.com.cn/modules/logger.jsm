/* vim: set ts=2 et sw=2 tw=80: */

let EXPORTED_SYMBOLS = ['Logger'];
let {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

try {
  var {LogManager} = Cu.import("resource://gre/modules/AddonLogging.jsm");
} catch (e) {
  var {Log} = Cu.import("resource://gre/modules/Log.jsm");
}

let Logger = {
  getLogger: function(aTarget) {
    ["LOG", "WARN", "ERROR"].forEach(function(aName) {
      aTarget.__defineGetter__(aName, function() {
        if (this._logger === undefined) {
          if (LogManager) {
            // AddonLogging.jsm has been removed since Fx30
            this._logger = {};
            LogManager.getLogger("COBA", this._logger);
            this._logMapper = function(s) {return s};
          } else {
            /**
             * Log.jsm has been supported since Fx26
             * We try to keep interfaces exactly the same here
             */
            this._logger = Log.repository.getLogger("COBA");
            let loggingEnabled = Services.prefs.getBoolPref("extensions.logging.enabled", false);
            this._logger.level = Log.Level[loggingEnabled ? "Debug" : "Warn"];
            this._logger.addAppender(new Log.ConsoleAppender(new Log.BasicFormatter()));
            this._logMapper = function(s) {
              return {
                LOG: "debug",
                WARN: "warn",
                ERROR: "error"
              }[s];
            };
          }
        }
        return function(message) {
          this._logger[this._logMapper(aName)](message);
        };
      });
    }, aTarget);
  }
};
