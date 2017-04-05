// based on /browser/components/downloads/src/DownloadsStartup.js

"use strict";

const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const kShellSvcCid = Components.ID("{055d195f-168e-4d98-b18a-71bfbfd3f617}");
const kShellSvcContractId = "@mozilla.org/browser/shell-service;1";

function ShellSvcStartup() { }

ShellSvcStartup.prototype = {
  classID: Components.ID("{1a80db92-3b6b-4872-968a-8711f53a09ba}"),

  _xpcom_factory: XPCOMUtils.generateSingletonFactory(ShellSvcStartup),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),

  observe: function (aSubject, aTopic, aData)
  {
    if (aTopic != "profile-after-change") {
      Cu.reportError("Unexpected observer notification.");
      return;
    }

    Components.manager.QueryInterface(Ci.nsIComponentRegistrar)
                      .registerFactory(kShellSvcCid, "",
                                       kShellSvcContractId, null);
  },
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([ShellSvcStartup]);
