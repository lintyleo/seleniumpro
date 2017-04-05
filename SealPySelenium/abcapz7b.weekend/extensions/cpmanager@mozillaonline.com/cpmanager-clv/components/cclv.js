const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://cpmanager-clv/CCLVData.jsm");

const prefKey = "extensions.cpmanager@mozillaonline.com.qvod_hao123_ts";
const trackingURL = "http://addons.g-fox.cn/qvod-hao123.gif?c=%CLI%&r=%RANDOM%";

function logAndTrack(aCli) {
  Services.console.logStringMessage("Found " + aCli);

  var ts = Date.now() / 86400e3;
  var reference = ts;
  try {
    reference = Services.prefs.getIntPref(prefKey);
  } catch(e) {}
  if (ts < reference) {
    return;
  }
  var tracker = Components.classes["@mozilla.com.cn/tracking;1"];
  if (tracker && tracker.getService().wrappedJSObject.ude) {
    var xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
    var url = trackingURL.replace("%CLI%", encodeURIComponent(aCli))
                         .replace("%RANDOM%", Math.random());
    xhr.open("GET", url, true);
    xhr.send();
    xhr.onload = function() {
      Services.prefs.setIntPref(prefKey, Math.floor(ts) + 1);
    };
  }
}

function CPCommandLineValidator() {
}

CPCommandLineValidator.prototype = {
  classID: Components.ID("{eada4c5c-6b7a-486b-8492-5297ba7a189e}"),

  /* nsISupports */
  QueryInterface : XPCOMUtils.generateQI([Ci.nsICommandLineValidator]),

  _flagsToValidate: [
    "-chrome",
    "-new-tab",
    "-new-window",
    "-remote",
    "-url"
  ],

  get _patterns() {
    delete this._patterns;
    return this._patterns = CCLVData.read().map((aItem) => new RegExp(aItem));
  },

  _shouldDrop: function(aCmdLine, aArgument, aFlag) {
    try {
      aArgument = this.resolveURIInternal(aCmdLine, aArgument);
    } catch(e) {
      return false;
    }

    var strToMatch = [aFlag, aArgument.spec].join(' ').trim();
    var matched = this._patterns.some((aPattern) => aPattern.test(strToMatch));

    logAndTrack(aFlag ? (aFlag + " " + aArgument.spec) : aArgument.spec);

    return matched;
  },

  resolveURIInternal: function(aCmdLine, aArgument) {
    var uri = aCmdLine.resolveURI(aArgument);
    var urifixup = Cc["@mozilla.org/docshell/urifixup;1"]
                             .getService(Ci.nsIURIFixup);

    if (!(uri instanceof Ci.nsIFileURL)) {
      return urifixup.createFixupURI(aArgument,
                                     urifixup.FIXUP_FLAG_FIX_SCHEME_TYPOS);
    }

    try {
      if (uri.file.exists())
        return uri;
    } catch (e) {
      Cu.reportError(e);
    }

    // We have interpreted the argument as a relative file URI, but the file
    // doesn't exist. Try URI fixup heuristics: see bug 290782.
    try {
      uri = urifixup.createFixupURI(aArgument, 0);
    } catch (e) {
      Cu.reportError(e);
    }

    return uri;
  },

  /* nsICommandLineValidator */
  validate : function cclv_validate(cmdLine) {
    if (cmdLine.state != cmdLine.STATE_INITIAL_LAUNCH) {
      return;
    }

    for (var current = 0, total = cmdLine.length; current < total;) {
      var argument = cmdLine.getArgument(current);
      /*
       * cmdLine.handleFlag will remove them, so flags are detected, retrieved
       * and removed using argument related methods.
       */
      if (this._flagsToValidate.indexOf(argument) > -1) {
        var flag = argument;
        var paramAsArg = cmdLine.getArgument(current + 1);
        if (this._shouldDrop(cmdLine, paramAsArg, flag)) {
            cmdLine.removeArguments(current, current + 1);
            total -= 2;
        } else {
          current += 2;
        }
      } else {
        if (this._shouldDrop(cmdLine, argument)) {
          cmdLine.removeArguments(current, current);
          total -= 1;
        } else {
          current += 1;
        }
      }
    }
  }
};

var components = [CPCommandLineValidator];
this.NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
