
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const _CID = Components.ID('{44FA5595-2842-6F60-1385-B6C7AC6F118B}');
const _CONTRACTID = "@mozilla.com.cn/clearHistory;1";


Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesUtils.jsm");

function LOG(txt) {
  var consoleService = Cc["@mozilla.org/consoleservice;1"]
                       .getService(Ci.nsIConsoleService);
                       consoleService.logStringMessage("clear history : " + txt);
}

function getBoolPref(name, defValue) {
  try {
  	return Services.prefs.getBoolPref(name);
  } catch (e) {
  	return defValue;
  }
}

function getIntPref(name, defValue) {
  try {
  	return Services.prefs.getIntPref(name);
  } catch (e) {
  	return defValue;
  }
}

function clearHistory()
{
  var isAuto = getBoolPref("privacy.sanitize.sanitizeOnShutdown", false);
  if (isAuto)
    return;
  var timeout = getIntPref("extensions.cpmanager@mozillaonline.com.sanitize.timeout", 0);
  var days = 0;
  switch (timeout) {
    case -1: //"daily":
      days = 1;
      break;
    case -2: //"weekly":
      days = 7;
      break;
    case -3: //"monthly":
      days = 30;
      break;
    case -4: //"querterly":
      days = 90;
      break;
    case -6: //"yearly":
      days = 365;
      break;
    default :
      days = timeout;
      break;
  }
  if (days == 0)
    return;
  var range = getClearRange(days)
  var globalHistory = PlacesUtils.history.QueryInterface(Ci.nsIBrowserHistory);
  globalHistory.removeVisitsByTimeframe(range[0], range[1]);
//  try {
//    var os = Components.classes["@mozilla.org/observer-service;1"]
//                       .getService(Components.interfaces.nsIObserverService);
//    os.notifyObservers(null, "browser:purge-session-history", "");
//  }
//  catch (e) { }
//
//  // Clear last URL of the Open Web Location dialog
//  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
//                        .getService(Components.interfaces.nsIPrefBranch);
//  try {
//    prefs.clearUserPref("general.open_location.last_url");
//  }
//  catch (e) { }
}

function getClearRange(days) {
  var startDate = 0;
  var endDate = Date.now() * 1000;
  endDate -= days * 24 * 3600000000; // 1*60*60*1000000
  return [startDate, endDate];
}

function chFactoryClass() {
  this.wrappedJSObject = this;
}

chFactoryClass.prototype = {
  classDescription: "Clear History On Close Firefox",
  contractID: _CONTRACTID,
  classID: _CID,
  _xpcom_categories: [{ category: "profile-after-change" }],
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  observe: function (aSubject, aTopic, aData) {
    switch (aTopic) {
      case "profile-after-change":
        Services.obs.addObserver(this, "quit-application", true);
        break;

      case "quit-application":
        clearHistory();
        break;
    };
  },

}

const NSGetFactory = XPCOMUtils.generateNSGetFactory([chFactoryClass]);
