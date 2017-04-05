/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const CD = Components.classesByID;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils",
  "resource://gre/modules/PlacesUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "RecentWindow",
  "resource:///modules/RecentWindow.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyGetter(this, "CETracking", function() {
  return Cc["@mozilla.com.cn/tracking;1"].getService().wrappedJSObject;
});

const origShellSvcID = "{63c7b9f4-0cc8-43f8-b666-0a661655cb73}";
const origShellSvc = CD[origShellSvcID].getService(Ci.nsIShellService);
try {
  origShellSvc.QueryInterface(Ci.nsIClassInfo);
} catch(e) {};
const workerURL = "resource://cmtracking/getExitCode.js";
const exeName = "helper.exe";
const helpURI = Services.io.newURI(
  "http://firefox.com.cn/help/default-browser/", null, null);
const osVer = Services.sysinfo.getProperty("version");
const log = function(aMsg) Services.console.logStringMessage(aMsg);

let maybeOpenHelp = function(aExtra) {
  let p = Services.prompt;

  let properties = "chrome://cmtracking/locale/cmtracking.properties";
  let bundle = Services.strings.createBundle(properties);

  if (p.confirmEx(null, Services.appinfo.name,
        bundle.GetStringFromName("setDefaultBrowserHelp.msg"),
        p.BUTTON_POS_0 * p.BUTTON_TITLE_IS_STRING,
        bundle.GetStringFromName("setDefaultBrowserHelp.openHelp"), "", "",
        null, {}) === 0) {
    let w = RecentWindow.getMostRecentBrowserWindow();
    if (w && w.switchToTabHavingURI) {
      w.switchToTabHavingURI(helpURI, true);
    }

    CETracking.track("sdb-openhelp-" + aExtra);
  }
};

let modShellSvc = Object.create(origShellSvc, {
  "setDefaultBrowser": {
    configurable: false,
    enumerable: true,
    writable: false,
    value: function(aClaimAllTypes, aForAllUsers) {
      let args = [].slice.call(arguments);
      try {
        PlacesUtils.asyncHistory.isURIVisited(helpURI, function(a, aIsVisited) {
          origShellSvc.setDefaultBrowser.apply(origShellSvc, args);

          try {
            let extra = osVer + "-" + (aIsVisited ? "a" : "b");

            CETracking.track("sdb-attempt-" + extra);

            let worker = new ChromeWorker(workerURL);
            worker.onmessage = function(aEvt) {
              if (!aEvt.data) {
                return;
              }
              let data = aEvt.data;

              switch (aEvt.data.type) {
                case "error":
                  log(aEvt.data.message + " (" + aEvt.data.code + ")");
                  break;
                case "exitcode":
                  log(aEvt.data.exeName + " exited with " + aEvt.data.code);

                  if (origShellSvc.isDefaultBrowser(false, aClaimAllTypes)) {
                    CETracking.track("sdb-success-" + extra);
                  } else {
                    CETracking.track("sdb-failure-" + extra);

                    maybeOpenHelp(extra);
                  }
                  break;
              }
            };
            worker.postMessage({
              exeName: exeName
            });

            // clear the visits to helpURI
            PlacesUtils.history.removePage(helpURI);
          } catch(e) {};
        });
      } catch(e) {
        origShellSvc.setDefaultBrowser.apply(origShellSvc, args);
      }
    }
  }
});

function ShellSvcProxy() {};

ShellSvcProxy.prototype = {
  classID: Components.ID("{055d195f-168e-4d98-b18a-71bfbfd3f617}"),
  QueryInterface: function(aIID) {
    if (aIID.equals(Ci.nsISupports)) {
      return modShellSvc;
    }
    /*
    if (aIID.equals(Ci.nsIClassInfo) && "classInfo" in modShellSvc) {
      return modShellSvc.classInfo;
    }
    */
    if (aIID.equals(Ci.nsIShellService)) {
      return modShellSvc;
    }
    if (aIID.equals(Ci.nsIWindowsShellService)) {
      return modShellSvc;
    }

    throw Cr.NS_ERROR_NO_INTERFACE;
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([ShellSvcProxy]);
