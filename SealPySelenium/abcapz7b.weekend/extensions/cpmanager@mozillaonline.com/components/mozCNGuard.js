/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Cu = Components.utils;
var Cr = Components.results;
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "setTimeout",
  "resource://gre/modules/Timer.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "SafeBrowsing",
  "resource://gre/modules/SafeBrowsing.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "SkipSBData",
  "resource://cmsafeflag/SkipSBData.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "OS",
  "resource://gre/modules/osfile.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "mozCNSafeBrowsing",
  "resource://cmsafeflag/CNSafeBrowsingRegister.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "CustomizableUI",
  "resource:///modules/CustomizableUI.jsm");

XPCOMUtils.defineLazyGetter(this, "CEHomepage", function() {
  try {
    let tmp = {};
    Cu.import("resource://ntab/mozCNUtils.jsm", tmp);
    if (tmp.Homepage && tmp.Homepage.aboutpage) {
      return tmp.Homepage;
    }
  } catch(ex) {};

  return {
    aboutpage: "http://i.firefoxchina.cn/"
  }
});
XPCOMUtils.defineLazyGetter(this, "CETracking", function() {
  return Cc["@mozilla.com.cn/tracking;1"].getService().wrappedJSObject;
});

var safeBrowsingHack = {
  _shouldCancel: {
    "apprep": false
  },
  _skipSBData: null,

  get appRepURL() {
    let appRepURL = "";
    try {
      appRepURL = this.prefs["apprep"].getCharPref("appRepURL");
    } catch(e) {};
    delete this.appRepURL;
    return this.appRepURL = appRepURL;
  },

  get prefs() {
    delete this.prefs;
    return this.prefs = {
      "apprep": Services.prefs.getDefaultBranch("browser.safebrowsing.")
    };
  },

  init: function() {
    // introduced in https://bugzil.la/1165816
    if (this.prefs["apprep"].getPrefType("downloads.remote.timeout_ms") ==
        Services.prefs.PREF_INVALID) {
      this._shouldCancel["apprep"] = true;
    }
  },

  onHttpRequest: function(aSubject) {
    let channel = aSubject;
    channel.QueryInterface(Ci.nsIHttpChannel);
    let uri = channel.originalURI;

    switch (uri.asciiSpec) {
      case SafeBrowsing.gethashURL:
        CETracking.track("sb-gethash-google");
        break;
      case this.appRepURL:
        this.maybeCancelOnTimeout(channel, "apprep");
        break;
      default:
        this.skipFalsePositiveSB(channel, uri);
        break;
    }
  },

  maybeCancelOnTimeout: function (aChannel, aType) {
    if (!this._shouldCancel[aType]) {
      return;
    }

    setTimeout(function() {
      if (aChannel && aChannel.isPending()) {
        aChannel.cancel(Cr.NS_ERROR_ABORT);
        CETracking.track("sb-" + aType + "-abort");
      }
    }, 10e3);
    CETracking.track("sb-" + aType + "-found");
  },

  skipFalsePositiveSB: function (aChannel, aURI) {
    if (!(aChannel.loadFlags & Ci.nsIChannel.LOAD_CLASSIFY_URI)) {
      return;
    }

    if (!this._skipSBData) {
      this._skipSBData = SkipSBData.read();
    }

    if ((this._skipSBData.urls &&
         this._skipSBData.urls[aURI.asciiSpec]) ||
        (this._skipSBData.baseDomains &&
         this._skipSBData.baseDomains[Services.eTLD.getBaseDomain(aURI)])) {
      aChannel.loadFlags &= ~Ci.nsIChannel.LOAD_CLASSIFY_URI;
      CETracking.track("sb-skip-classify");
    } else {
      CETracking.track("sb-will-classify");
    }
  }
}

var userJSDetection = {
  get sandbox() {
    let nullprincipal = Cc["@mozilla.org/nullprincipal;1"].
      createInstance(Ci.nsIPrincipal);

    let sandbox = Cu.Sandbox(nullprincipal);
    sandbox.user_pref = this.userPref.bind(this);

    delete this.sandbox;
    return this.sandbox = sandbox;
  },

  detect: function() {
    let userJS = Services.dirsvc.get("ProfD", Ci.nsIFile);
    userJS.append("user.js");
    if (!userJS.exists()) {
      return;
    }

    let userJSURI = Services.io.newFileURI(userJS);
    Services.scriptloader.loadSubScriptWithOptions(userJSURI.spec, {
      charset: "UTF-8",
      ignoreCache: true,
      target: this.sandbox
    });
  },

  isCEHome: function(aURL) {
    let spec = aURL;
    try {
      spec = Services.io.newURI(spec, null, null).asciiSpec;
    } catch(e) {
      try {
        spec = Services.uriFixup.getFixupURIInfo(spec,
          Ci.nsIURIFixup.FIXUP_FLAG_NONE).preferredURI.asciiSpec;
      } catch(e) {};
    }

    return [
      /^about:cehome$/,
      /^http:\/\/[ein]\.firefoxchina\.cn\/?$/
    ].some((aExpectedSpec) => {
      return aExpectedSpec.test(spec);
    });
  },

  userPref: function(key, val) {
    switch (key) {
      case "browser.startup.homepage":
        CETracking.track("userjs-homepage-exists");

        if (val.split("|").some(this.isCEHome)) {
          break;
        };

        CETracking.track("userjs-homepage-other");
        break;
      default:
        break;
    }
  },

  removeHomepage: function() {
    let path = OS.Path.join(OS.Constants.Path.profileDir, "user.js");
    OS.File.exists(path).then(function(aExists) {
      if (!aExists) return;
      OS.File.stat(path).then(function(aInfo) {
        if (!aInfo.size) return;
        // From fx30 on encoding can be inlined as a parameter for OS.File.read
        OS.File.read(path).then(function(aArray) {
          let text = new TextDecoder().decode(aArray);
          let content = text.replace(/^\s*user_pref\s*\(\s*("|')browser\.startup\.homepage\1.+\)\s*;\s*$/mg, "");
          OS.File.writeAtomic(path, content, {
            encoding: "utf-8"
          });
        });
      });
    });
  }
};

var buttonRemoval = {
  id: "dummy-button-id",
  prefKey: "dummy-pref-key",
  earlyReturn: function() {
    return false;
  },

  init: function() {
    if (this.earlyReturn()) {
      return;
    }

    let removed = false;
    try {
      removed = Services.prefs.getBoolPref(this.prefKey);
    } catch(e) {};
    if (removed) {
      return;
    }

    CustomizableUI.addListener(this);
  },
  onAreaNodeRegistered: function(aArea) {
    if (aArea !== CustomizableUI.AREA_NAVBAR) {
      return;
    }

    Services.prefs.setBoolPref(this.prefKey, true);
    CustomizableUI.removeListener(this);

    let placementArea = CustomizableUI.getPlacementOfWidget(this.id);
    if (!placementArea || placementArea.area !== CustomizableUI.AREA_NAVBAR) {
      return;
    }

    if (!CustomizableUI.isWidgetRemovable(this.id)) {
      return;
    }
    CustomizableUI.removeWidgetFromArea(this.id);
  }
};

var loopButtonRemoval = Object.create(buttonRemoval, {
  id: {
    value: "loop-button"
  },
  prefKey: {
    value: "extensions.cpmanager@mozillaonline.com.loopButtonRemoved"
  },
  earlyReturn: {
    value: function() {
      return Services.vc.compare(Services.appinfo.version, "36.0") < 0 ||
             Services.prefs.getPrefType("loop.hawk-session-token") ||
             Services.prefs.getPrefType("loop.hawk-session-token.fxa");
    }
  }
});

var pocketButtonRemoval = Object.create(buttonRemoval, {
  id: {
    value: "pocket-button"
  },
  prefKey: {
    value: "extensions.cpmanager@mozillaonline.com.pocketButtonRemoved"
  },
  earlyReturn: {
    value: function() {
      return Services.vc.compare(Services.appinfo.version, "38.0.5") < 0 ||
             Services.prefs.getChildList("browser.pocket.settings.").length ||
             Services.prefs.getChildList("extensions.pocket.settings.").length;
    }
  }
});

var socialShareRemoval = Object.create(buttonRemoval, {
  id: {
    value: "social-share-button"
  },
  prefKey: {
    value: "extensions.cpmanager@mozillaonline.com.socialShareRemoved"
  },
  earlyReturn: {
    value: function() {
      return Services.vc.compare(Services.appinfo.version, "35.0") < 0;
    }
  }
});

var mobilePromoLinksHack = {
  init: function() {
    CustomizableUI.addListener(this);
  },
  onWidgetBeforeDOMChange: function(node, nextNode, container, isRemoval) {
    if (isRemoval || node.id !== "sync-button" || !container) {
      return;
    }

    let doc = container.ownerDocument,
        selector = "#PanelUI-remotetabs-mobile-promo > .remotetabs-promo-link";
    [].forEach.call(doc.querySelectorAll(selector), function(label) {
      let os;
      if (label.hasAttribute("mobile-promo-os")) {
        os = label.getAttribute("mobile-promo-os");
      } else if (label.hasAttribute("href")) {
        let regex = /^https:\/\/www\.mozilla\.org\/firefox\/(android|ios)\//;
        let result = regex.exec(label.getAttribute("href"));
        if (!result) {
          return;
        }

        os = result[1];
        label.removeAttribute("href");
      }

      // similar to https://bugzil.la/1237945
      label.addEventListener("click", function(evt) {
        if (evt.button > 1) {
          return;
        }
        evt.stopPropagation();

        let link = "http://www.firefox.com.cn/#" + os;
        doc.defaultView.openUILinkIn(link, "tab");
        CustomizableUI.hidePanelForNode(evt.target);
      }, true);
    });
  }
};

var defaultFontHack = {
  get prefs() {
    delete this.prefs;
    return this.prefs = Services.prefs.getDefaultBranch("font.");
  },

  init: function() {
    this.defaultPrefTweak();
  },

  defaultPrefTweak: function() {
    switch (Services.appinfo.OS) {
      case "WINNT":
        let key = "name-list.sans-serif.zh-CN",
            val = "Microsoft YaHei, MS Song, SimSun, SimSun-ExtB";
        this.prefs.setCharPref(key, val);
        break;
      default:
        break;
    }
  }
}

function mozCNGuard() {}

mozCNGuard.prototype = {
  classID: Components.ID("{06686705-c9e6-464d-b34f-3c4dc2d5b183}"),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),

  // nsIObserver
  observe: function MCG_observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "profile-after-change":
        Services.obs.addObserver(this, "browser-delayed-startup-finished", false);
        Services.obs.addObserver(this, "sessionstore-state-finalized", false);
        Services.obs.addObserver(this, "toplevel-window-ready", false);
        Services.obs.addObserver(this, "http-on-modify-request", false);
        Services.obs.addObserver(this, "http-on-examine-response", false);
        Services.obs.addObserver(this, "http-on-examine-cached-response", false);
        Services.obs.addObserver(this, "http-on-examine-merged-response", false);
        Services.obs.addObserver(this, "prefservice:after-app-defaults", false);
        safeBrowsingHack.init();
        mozCNSafeBrowsing.init();
        userJSDetection.detect();
        userJSDetection.removeHomepage();
        loopButtonRemoval.init();
        pocketButtonRemoval.init();
        socialShareRemoval.init();
        mobilePromoLinksHack.init();
        defaultFontHack.init();
        break;
      case "browser-delayed-startup-finished":
        this.initProgressListener(aSubject);
        break;
      case "sessionstore-state-finalized":
      case "sessionstore-windows-restored":
        this.trackRogueStartup(aTopic);
        break;
      case "http-on-modify-request":
        safeBrowsingHack.onHttpRequest(aSubject);
        mozCNSafeBrowsing.onHttpRequest(aSubject);
        break;
      case "http-on-examine-response":
        mozCNSafeBrowsing.onHttpResponse(aSubject);
        // intentionally no break
      case "http-on-examine-cached-response":
      case "http-on-examine-merged-response":
        this.dropRogueRedirect(aSubject);
        break;
      case "prefservice:after-app-defaults":
        mozCNSafeBrowsing.defaultPrefTweak();
        defaultFontHack.defaultPrefTweak();
        break;
    }
  },

  get browserHandler() {
    delete this.browserHandler;
    return this.browserHandler = Cc["@mozilla.org/browser/clh;1"].
      getService(Ci.nsIBrowserHandler);
  },

  get startPageChoice() {
    let choice = "badpref";
    try {
      choice = Services.prefs.getIntPref("browser.startup.page");
    } catch(e) {};

    delete this.startPageChoice;
    return this.startPageChoice = choice;
  },

  isCEHome: function MCG_isCEHome(aSpec) {
    return [
      /^about:cehome$/,
      /^http:\/\/[ein]\.firefoxchina\.cn\/?$/
    ].some((aExpectedSpec) => {
      return aExpectedSpec.test(aSpec);
    });
  },

  trackRogueStartup: function MCG_trackRoughStartup(aTopic) {
    Services.obs.removeObserver(this, aTopic);

    let sessionStartup = Cc["@mozilla.org/browser/sessionstartup;1"].
      getService(Ci.nsISessionStartup);
    if (aTopic == "sessionstore-state-finalized" &&
        sessionStartup.sessionType != sessionStartup.NO_SESSION) {
      Services.obs.addObserver(this, "sessionstore-windows-restored", false);
      return;
    }

    let w = Services.wm.getMostRecentWindow("navigator:browser");

    // restore on startup/restart
    let doRestore = sessionStartup.doRestore();

    // urls to open when there's no url in arguments
    let defaultArgs = this.browserHandler.defaultArgs;
    let defaultArgZero = defaultArgs.split("|")[0];

    // will open cehome in foreground if no arguments
    let prefSet = !doRestore && this.isCEHome(defaultArgZero);

    // no extra arguments
    let noArgs = w.arguments && w.arguments[0] &&
      w.arguments[0] == defaultArgs;

    let self = this;
    let reportFirstLocation = function(aURI) {
      let expected = aURI.asciiSpec == defaultArgZero;
      // normalize defaultArgZero, e.g. add trailing slash.
      try {
        let defaultArgZeroURI = Services.io.newURI(defaultArgZero, null, null);
        expected = aURI.equals(defaultArgZeroURI);
      } catch(e) {};

      if (prefSet && noArgs) {
        expected = expected || aURI.asciiSpec;
      }

      let urlTemplate = "http://addons.g-fox.cn/firstLocation.gif?" +
                        "p=%PREF_SET%&a=%NO_ARGS%&e=%EXPECTED%" +
                        "&bsp=%BSP_CHOICE%&r=%RANDOM%";
      let url = urlTemplate.
        replace("%PREF_SET%", prefSet).
        replace("%NO_ARGS%", noArgs).
        replace("%EXPECTED%", encodeURIComponent(expected)).
        replace("%BSP_CHOICE%", self.startPageChoice).
        replace("%RANDOM%", Math.random());
      CETracking.send(url);
    };

    let progressListener = {
      onLocationChange: function(aWebProgress, b, aLocation, d) {
        if (aWebProgress.isTopLevel && (aLocation instanceof Ci.nsIURI)) {
          w.gBrowser.removeProgressListener(progressListener);

          reportFirstLocation(aLocation);
        }
      }
    };

    /**
     * BUSY_FLAGS_BEFORE_PAGE_LOAD seems to work, but not really sure.
     * could use a better check here.
     */
    let docShell = w.gBrowser.selectedBrowser.docShell;
    if (docShell.busyFlags & Ci.nsIDocShell.BUSY_FLAGS_BEFORE_PAGE_LOAD) {
      /**
       * addProgressListener: listener for the selectedBrowser
       * addTabsProgressListener: listener for every browser in gBrowser
       */
      w.gBrowser.addProgressListener(progressListener);
    } else {
      reportFirstLocation(w.gBrowser.selectedBrowser.currentURI);
    }

    this.maybeOpenStartPages(w);
  },

  maybeOpenStartPages: function MCG_maybeOpenStartPages(aSubject) {
    if (this.startPageChoice != 1) {
      return;
    }

    let argumentsZero = aSubject.arguments && aSubject.arguments[0];
    if (this.browserHandler.defaultArgs == argumentsZero) {
      return;
    }

    let self = this;
    if (argumentsZero instanceof Ci.nsISupportsArray) {
      let len = argumentsZero.Count(), externalURLs = [];
      for (let i = 0; i < len; i++) {
        let urisstring = argumentsZero.GetElementAt(i)
                                      .QueryInterface(Ci.nsISupportsString);
        let uri = Services.io.newURI(urisstring.data, null, null);
        externalURLs.push(uri.asciiSpec);
      }

      this.browserHandler.startPage.split("|").forEach(function(aPage, aIndex) {
        let uri = Services.io.newURI(aPage, null, null);
        let title;

        // Don't open if already in commandline argument.
        let page = {
          "about:cehome": CEHomepage.aboutpage
        }[uri.asciiSpec] || uri.asciiSpec;
        if (externalURLs.some(function(externalURL) {
          return externalURL.split("?")[0] == page.split("?")[0];
        })) {
          return;
        }

        if (self.isCEHome(aPage)) {
          aPage = uri.asciiSpec + "?from=extra_start";
          title = "\u706b\u72d0\u4e3b\u9875";
        }

        aSubject.PlacesUtils.asyncHistory.getPlacesInfo(uri, {
          handleError: function() {},
          handleResult: function(aPlaceInfo) {
            title = aPlaceInfo.title;
          },
          handleCompletion: function() {
            let tab = aSubject.gBrowser.addTab();
            aSubject.gBrowser.moveTabTo(tab, aIndex);
            aSubject.SessionStore.setTabState(tab, JSON.stringify({
              entries: [{ url: aPage, title: title }]
            }));
          }
        });
      });
    }
  },

  initProgressListener: function MCG_initProgressListener(aSubject) {
    let w = aSubject;
    w.gBrowser.addTabsProgressListener({
      // see /xpcom/base/ErrorList.h
      get NS_ERROR_PHISHING_URI() {
        return 1 * Math.pow(2, 31) + (0x45 + 24) * Math.pow(2, 16) + 31;
      },
      onLocationChange: function(a, b, aRequest, aLocation, aFlags) {
        if (aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE) {
          if (aRequest.status & this.NS_ERROR_PHISHING_URI) {
            CETracking.track("sb-blocked-phish");
          }
        }
      }
    });
  },

  dropRogueRedirect: function MCG_dropRogueRedirect(aSubject) {
    let channel = aSubject;
    channel.QueryInterface(Ci.nsIHttpChannel);

    if (!(channel.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI)) {
      return;
    }

    let restrictedHosts = {
      "huohu123.com": "h.17huohu.com",
      "e.firefoxchina.cn": "e.17huohu.com",
      "i.firefoxchina.cn": "i.17huohu.com",
      "n.firefoxchina.cn": "n.17huohu.com",
      "i.g-fox.cn": "g.17huohu.com",
      "www.huohu123.com": "h.17huohu.com",
      "e.17huohu.com": "",
      "i.17huohu.com": "",
      "g.17huohu.com": "",
      "h.17huohu.com": "",
      "n.17huohu.com": ""
    };

    if (Object.keys(restrictedHosts).indexOf(channel.originalURI.host) > -1) {
      let responseStatus = 0;
      try {
        responseStatus = channel.responseStatus;
      } catch(e) {};
      if ([301, 302].indexOf(responseStatus) > -1) {
        let redirectTo = channel.getResponseHeader("Location");
        redirectTo = Services.io.newURI(redirectTo, null, channel.originalURI);

        if (Object.keys(restrictedHosts).indexOf(redirectTo.host) == -1) {
          let newURI = channel.originalURI.clone();
          let newHost = restrictedHosts[newURI.host];
          if (newHost) {
            newURI.host = newHost;

            let webNavigation = channel.notificationCallbacks.
              getInterface(Ci.nsIWebNavigation);
            channel.cancel(Cr.NS_BINDING_ABORTED);
            webNavigation.loadURI(newURI.spec, null, null, null, null);
          }

          let uuid = "NA";
          let uuidKey = "extensions.cpmanager@mozillaonline.com.uuid";
          try {
            uuid = Services.prefs.getCharPref(uuidKey);
          } catch(e) {}

          let urlTemplate = "http://addons.g-fox.cn/302.gif?r=%RANDOM%" +
                            "&status=%STATUS%&from=%FROM%&to=%TO%&id=%ID%";
          let url = urlTemplate.
            replace("%STATUS%", channel.responseStatus).
            replace("%FROM%", encodeURIComponent(channel.originalURI.spec)).
            replace("%TO%", encodeURIComponent(redirectTo.spec)).
            replace("%ID%", encodeURIComponent(uuid)).
            replace("%RANDOM%", Math.random());
          CETracking.send(url);
        }
      }
    }
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([mozCNGuard]);
