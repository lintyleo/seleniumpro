/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;

try {
  Cu.importGlobalProperties(["Blob"]);
} catch(e) {};

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "setTimeout",
  "resource://gre/modules/Timer.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "clearTimeout",
  "resource://gre/modules/Timer.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PageThumbs",
  "resource://gre/modules/PageThumbs.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PageThumbsStorage",
  "resource://gre/modules/PageThumbs.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "OS",
  "resource://gre/modules/osfile.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "fxAccounts",
  "resource://gre/modules/FxAccounts.jsm");

XPCOMUtils.defineLazyGetter(this, "BackgroundPageThumbs", function() {
  let temp = {};
  try {
    Cu.import("resource://gre/modules/BackgroundPageThumbs.jsm", temp);

    if (!BackgroundPageThumbs.captureIfMissing) {
      throw new Error("BackgroundPageThumbs not recent enough");
    }
  } catch(e) {
    /*
     * a local copy of BackgroundPageThumbs.jsm as in Fx 27.0.1, if
     * 1. resource://gre/modules/BackgroundPageThumbs.jsm does not exist;
     * 2. resource://gre/modules/BackgroundPageThumbs.jsm from esr24.
     */
    Cu.import("resource://ntab/BackgroundPageThumbs.jsm", temp);
  }
  return temp.BackgroundPageThumbs;
});

XPCOMUtils.defineLazyGetter(this, "gMM", function() {
  return Cc["@mozilla.org/globalmessagemanager;1"].
    getService(Ci.nsIMessageListenerManager);
});

XPCOMUtils.defineLazyGetter(this, "WebChannel", function() {
  let temp = {};
  try {
    Cu.import("resource://gre/modules/WebChannel.jsm", temp);
  } catch(e) {
    // a local copy of WebChannel.jsm as in Fx 34.0.5
    Cu.import("resource://ntab/WebChannel.jsm", temp);
    gMM.loadFrameScript("chrome://ntab/content/webChannelContent.js", true);
  }
  return temp.WebChannel;
});

XPCOMUtils.defineLazyModuleGetter(this, "delayedSuggestBaidu",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Frequent",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Homepage",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "nxdomainMitigation",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Session",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "getPref",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "NTabDB",
  "resource://ntab/NTabDB.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "NTabSync",
  "resource://ntab/NTabSync.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PartnerBookmarks",
  "resource://ntab/PartnerBookmarks.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "QuickDialData",
  "resource://ntab/QuickDialData.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Tracking",
  "resource://ntab/Tracking.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Promo",
  "resource://cehp-promo/Promo.jsm");

let searchEngines = {
  expected: /^https?:\/\/www\.baidu\.com\/baidu\?wd=TEST&tn=monline(?:_|_4_)dg(?:&ie=utf-8)?$/,

  reportUnexpected: function(aKey, aAction, aEngine, aIncludeURL) {
    let url = "NA";
    try {
      url = aEngine.getSubmission("TEST").uri.asciiSpec;
    } catch(e) {}

    let isExpected = this.expected.test(url);
    let href = "";
    if (!isExpected && !!aIncludeURL) {
      href = url;
    }

    Tracking.track({
      type: "searchplugins",
      action: aAction,
      sid: aKey,
      fid: isExpected,
      href: href
    });
  },

  patchBrowserSearch: function(aWindow) {
    // Since Fx 44
    if (aWindow.gURLBar && aWindow.gURLBar._parseAndRecordSearchEngineAction) {
      try {
        Services.obs.removeObserver(this, "keyword-search");
      } catch(ex) {};
    }

    let BrowserSearch = aWindow.BrowserSearch;
    if (!BrowserSearch || !BrowserSearch.recordSearchInHealthReport) {
      return;
    }

    let origRSIHR = BrowserSearch.recordSearchInHealthReport;
    let self = this;
    BrowserSearch.recordSearchInHealthReport = function(aEngine, aSource) {
      origRSIHR.apply(BrowserSearch, [].slice.call(arguments));

      self.trackUsage(aEngine, aSource);
    };
  },

  trackUsage: function(aEngine, aSource) {
    try {
      if (!(aEngine instanceof Ci.nsISearchEngine) ||
          typeof(aSource) != "string") {
        return;
      }

      let key = {
        "\u767e\u5ea6": "baidu"
      }[aEngine.name] || "other";

      this.reportUnexpected(key, aSource, aEngine, false);
    } catch(e) {};
  },

  removeLegacyEngines: function() {
    [{
      legacy: Services.search.getEngineByName("\u5353\u8d8a\u4e9a\u9a6c\u900a"),
      update: Services.search.getEngineByName("\u4e9a\u9a6c\u900a")
    }, {
      legacy: Services.search.getEngineByName("\u6dd8\u5b9d\u8d2d\u7269"),
      update: Services.search.getEngineByName("\u7231\u6dd8\u5b9d")
    }, {
      legacy: Services.search.getEngineByName("\u7231\u6dd8\u5b9d\u8d2d\u7269"),
      update: Services.search.getEngineByName("\u7231\u6dd8\u5b9d")
    }].forEach(function(aEngines) {
      if ((aEngines.legacy && !aEngines.legacy.hidden) &&
          (aEngines.update && !aEngines.update.hidden)) {
        if (Services.search.currentEngine == aEngines.legacy) {
          Services.search.currentEngine = aEngines.update;
        }
        Services.search.removeEngine(aEngines.legacy);
      }
    });
  },

  init: function() {
    let self = this;

    Services.obs.addObserver(this, "keyword-search", false);
    Services.search.init(function() {
      let current = Services.search.currentEngine,
          baidu = Services.search.getEngineByName("\u767e\u5ea6");
      self.reportUnexpected("current", "detect", current, true);
      self.reportUnexpected("baidu", "detect", baidu, true);
      self.removeLegacyEngines();
    });
  },

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "keyword-search":
        this.trackUsage(aSubject, "urlbar");
        break;
    }
  }
};

let fxAccountsProxy = {
  messageName: "mozCNUtils:FxAccounts",
  mutationConfig: {
    attributes: true,
    attributeFilter: [
      "disabled",
      "failed",
      "fxastatus",
      "hidden",
      "label",
      "signedin",
      "status",
      "tooltiptext"
    ]
  },
  generateKVs: function(gFxAccounts) {
    let kvs = {};

    if (gFxAccounts.button) {
      this.mutationConfig.attributeFilter.forEach(function(aKey) {
        if (gFxAccounts.button.hasAttribute(aKey)) {
          kvs[aKey] = gFxAccounts.button.getAttribute(aKey);
        }
      });
    } else if (gFxAccounts.panelUIFooter &&
               gFxAccounts.panelUILabel &&
               gFxAccounts.panelUIStatus) {
      ["disabled", "fxastatus"].forEach(function(aKey) {
        if (gFxAccounts.panelUIFooter.hasAttribute(aKey)) {
          kvs[aKey] = gFxAccounts.panelUIFooter.getAttribute(aKey);
        }
      });
      ["label"].forEach(function(aKey) {
        if (gFxAccounts.panelUILabel.hasAttribute(aKey)) {
          kvs[aKey] = gFxAccounts.panelUILabel.getAttribute(aKey);
        }
      });
      ["tooltiptext"].forEach(function(aKey) {
        if (gFxAccounts.panelUIStatus.hasAttribute(aKey)) {
          kvs[aKey] = gFxAccounts.panelUIStatus.getAttribute(aKey);
        }
      });
    }

    return kvs;
  },
  maybeRegisterMutationObserver: function(aWindow) {
    let gFxAccounts = aWindow.gFxAccounts;
    let windowMM = aWindow.messageManager;

    if (!gFxAccounts || !windowMM) {
      return;
    }

    let self = this;
    let config = this.mutationConfig;
    let observer = new aWindow.MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type != "attributes" ||
            config.attributeFilter.indexOf(mutation.attributeName) < 0) {
          return;
        }

        let kvs = self.generateKVs(gFxAccounts);
        windowMM.broadcastAsyncMessage(self.messageName, "mutation", kvs);
      });
    });

    if (gFxAccounts.button) {
      observer.observe(gFxAccounts.button, config);
    } else {
      observer.observe(gFxAccounts.panelUIFooter, config);
      observer.observe(gFxAccounts.panelUILabel, config);
      observer.observe(gFxAccounts.panelUIStatus, config);
    }
  },
  maybeInitContentButton: function(aBrowser) {
    let gFxAccounts = aBrowser.ownerGlobal &&
                      aBrowser.ownerGlobal.gFxAccounts;
    let browserMM = aBrowser.messageManager;

    if (!gFxAccounts || !browserMM) {
      return;
    }

    let kvs = this.generateKVs(gFxAccounts);
    browserMM.sendAsyncMessage(this.messageName, "init", kvs);
  },
  init: function() {
    gMM.addMessageListener(this.messageName, this);
  },
  // nsIMessageListener
  receiveMessage: function(aMessage) {
    let browser = aMessage.target;
    if (aMessage.name !== this.messageName ||
        !browser.currentURI.equals(NTabDB.uri)) {
      return;
    }

    switch(aMessage.data) {
      case "init":
        this.maybeInitContentButton(browser);
        break;
      case "action":
        browser.ownerGlobal.gFxAccounts.onMenuPanelCommand(aMessage.objects);
        break;
    }
  },
};

let appcacheTempFix = {
  attribute: "mozCNAppcacheTempFix",
  delay: 3e3,
  fixApplied: false,

  get appCacheService() {
    delete this.appCacheService;
    return this.appCacheService =
      Cc["@mozilla.org/network/application-cache-service;1"].
        getService(Ci.nsIApplicationCacheService);
  },

  clear: function(aHost) {
    let groups = this.appCacheService.getGroups();
    for (let i = 0; i < groups.length; i++) {
      let uri = Services.io.newURI(groups[i], null, null);
      if (uri.asciiHost == aHost) {
        let cache = this.appCacheService.getActiveCache(groups[i]);
        cache.discard();
      }
    }
    this.fixApplied = true;

    Tracking.track({
      type: "appcache",
      action: "clear",
      sid: "dummy"
    });
  },

  attach: function(aBrowser, aRequest) {
    this.remove(aBrowser, aRequest);
    if (this.fixApplied) {
      return;
    }

    let timeoutId = setTimeout((function() {
      if (aBrowser.mDestroyed !== false) {
        return;
      }

      this.clear(aRequest.URI.asciiHost);

      aRequest.cancel(Cr.NS_BINDING_ABORTED);
      aBrowser.webNavigation.loadURI(aRequest.URI.spec, null, null, null, null);
    }).bind(this), this.delay);
    aBrowser.setAttribute(this.attribute, timeoutId);
  },

  remove: function(aBrowser, aRequest) {
    if (aBrowser.hasAttribute(this.attribute)) {
      let timeoutId = aBrowser.getAttribute(this.attribute);
      aBrowser.removeAttribute(this.attribute);
      clearTimeout(parseInt(timeoutId, 10));
    }
  }
}

function mozCNUtils() {}

mozCNUtils.prototype = {
  classID: Components.ID("{828cb3e4-a050-4f95-8893-baa0b00da7d7}"),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsIMessageListener]),

  // nsIObserver
  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "profile-after-change":
        Services.obs.addObserver(this, "browser-delayed-startup-finished", false);
        Services.obs.addObserver(this, "http-on-examine-response", false);
        Services.obs.addObserver(this, "http-on-examine-cached-response", false);
        Services.obs.addObserver(this, "http-on-examine-merged-response", false);
        Services.obs.addObserver(this, "places-browser-init-complete", false);
        mozCNWebChannels.init();
        this.initNTab();
        NTabDB.migrateNTabData();
        this.initMessageListener();
        delayedSuggestBaidu.init();
        Homepage.init();
        searchEngines.init();
        fxAccountsProxy.init();
        NTabSync.init();
        Promo.init();
        nxdomainMitigation.init();
        break;
      case "browser-delayed-startup-finished":
        this.initProgressListener(aSubject);
        searchEngines.patchBrowserSearch(aSubject);
        fxAccountsProxy.maybeRegisterMutationObserver(aSubject);
        break;
      case "http-on-examine-response":
      case "http-on-examine-cached-response":
      case "http-on-examine-merged-response":
        this.trackHTTPStatus(aSubject, aTopic);
        break;
      case "places-browser-init-complete":
        PartnerBookmarks.init();
        break;
    }
  },

  initNTab: function() {
    gMM.loadFrameScript("chrome://ntab/content/ntabContent.js", true);
  },

  trackHTTPStatus: function(aSubject, aTopic) {
    let channel = aSubject;
    channel.QueryInterface(Ci.nsIHttpChannel);

    if ([
      NTabDB.prePath,
      "http://i.g-fox.cn",
      "http://e.firefoxchina.cn",
      "http://i.firefoxchina.cn",
      "http://n.firefoxchina.cn"
    ].indexOf(channel.URI.prePath) == -1 ||
        !(channel.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI)) {
      return;
    }

    if ([200, 302, 304].indexOf(channel.responseStatus) == -1) {
      Tracking.track({
        type: "http-status",
        sid: channel.responseStatus,
        action: aTopic,
        href: channel.URI.spec,
        altBase: "http://robust.g-fox.cn/ntab.gif"
      });
    }
  },

  // nsIMessageListener
  receiveMessage: function(aMessage) {
    if (this.MESSAGES.indexOf(aMessage.name) < 0 ||
        !aMessage.target.currentURI.equals(NTabDB.uri)) {
      return;
    }

    let w = aMessage.target.ownerGlobal;

    switch (aMessage.name) {
      case "mozCNUtils:Tools":
        switch (aMessage.data) {
          case "downloads":
            w.BrowserDownloadsUI();
            break;
          case "bookmarks":
            w.PlacesCommandHook.showPlacesOrganizer("AllBookmarks");
            break;
          case "history":
            w.PlacesCommandHook.showPlacesOrganizer("History");
            break;
          case "addons":
            w.BrowserOpenAddonsMgr();
            break;
          case "sync":
            let weave = Cc["@mozilla.org/weave/service;1"].
              getService(Ci.nsISupports).wrappedJSObject;

            if (weave.fxAccountsEnabled) {
              fxAccounts.getSignedInUser().then(function(userData) {
                if (userData) {
                  w.openPreferences("paneSync");
                } else {
                  w.loadURI("about:accounts?entrypoint=aboutntab");
                }
              });
            } else {
              w.openPreferences("paneSync");
            }
            break;
          case "settings":
            w.openPreferences();
            break;
        }
        break;
    }
  },

  MESSAGES: [
    "mozCNUtils:Tools"
  ],
  initMessageListener: function() {
    for (let msg of this.MESSAGES) {
      gMM.addMessageListener(msg, this);
    }
  },

  // TabsProgressListener variant of nsIWebProgressListener
  onStateChange: function(aBrowser, b, aRequest, aStateFlags, aStatus) {
    if (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_WINDOW) {
      let isStart = aStateFlags & Ci.nsIWebProgressListener.STATE_START;
      let isStop = aStateFlags & Ci.nsIWebProgressListener.STATE_STOP;
      if (!isStart && !isStop) {
        return;
      }

      if (NTabDB.uri.equals(aRequest.URI)) {
        if (isStart) {
          appcacheTempFix.attach(aBrowser, aRequest);
        }
        if (isStop) {
          appcacheTempFix.remove(aBrowser, aRequest);
        }
      }

      if (delayedSuggestBaidu.isGoogleSearch(aRequest.URI)) {
        if (isStart) {
          delayedSuggestBaidu.attach(aBrowser, aRequest);
        }
        if (isStop) {
          delayedSuggestBaidu.remove(aBrowser, aRequest);
        }
      }
    }
  },

  onLocationChange: function(aBrowser, b, aRequest, aLocation, aFlags) {
    if (aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE) {
      // before we can fix the OfflineCacheInstaller ?
      if (aLocation.equals(NTabDB.uri)) {
        aRequest.cancel(Cr.NS_BINDING_ABORTED);
        aBrowser.webNavigation.loadURI("about:blank", null, null, null, null);
      }
    }
  },

  initProgressListener: function(aSubject) {
    aSubject.gBrowser.addTabsProgressListener(this);
  }
};

let mozCNWebChannel = function(aChannelID, aURI, aListener) {
  this.channel = new WebChannel(aChannelID, aURI);
  this.channel.listen((this[aListener] || this.baseListener).bind(this));
};
mozCNWebChannel.prototype = {
  baseListener: function (a, aMessage, aSender) {
    let self = this;
    switch(aMessage.key) {
      case "frequent.query":
        Frequent.query(function(aEntries) {
          self.channel.send({
            id: aMessage.id,
            key: aMessage.key,
            data: aEntries
          }, aSender);
        }, aMessage.parameters.limit);
        break;
      case "frequent.remove":
        Frequent.remove([aMessage.parameters.url]);
        break;
      case "last.query":
        Session.query(function(aEntries) {
          self.channel.send({
            id: aMessage.id,
            key: aMessage.key,
            data: aEntries
          }, aSender);
        }, aMessage.parameters.limit);
        break;
      case "last.remove":
        Session.remove([aMessage.parameters.url]);
        break;
      case "startup.channelid":
        this.channel.send({
          id: aMessage.id,
          key: aMessage.key,
          data: getPref("app.chinaedition.channel", "www.firefox.com.cn")
        }, aSender);
        break;
    }
  },
  offlintabListener: function (a, aMessage, aSender) {
    this.baseListener.apply(this, arguments);

    let self = this;
    switch(aMessage.key) {
      case "bookmark.query":
        let db = Cc["@mozilla.org/browser/nav-history-service;1"].
                   getService(Ci.nsINavHistoryService).
                   QueryInterface(Ci.nsPIPlacesDatabase).
                   DBConnection;
        let sql = ("SELECT b.title as title, p.url as url " +
                   "FROM moz_bookmarks b, moz_places p " +
                   "WHERE b.type = 1 AND b.fk = p.id AND p.hidden = 0");
        let statement = db.createAsyncStatement(sql);
        let links = [];
        db.executeAsync([statement], 1, {
          handleResult: function(aResultSet) {
            let row;

            while (row = aResultSet.getNextRow()) {
              links.push({
                title: row.getResultByName("title"),
                url: row.getResultByName("url")
              });
            }
          },
          handleError: function(aError) {
            self.channel.send({
              id: aMessage.id,
              key: aMessage.key,
              data: []
            }, aSender);
          },
          handleCompletion: function(aReason) {
            self.channel.send({
              id: aMessage.id,
              key: aMessage.key,
              data: links
            }, aSender);
          }
        });
        break;
      case "thumbs.getThumbnail":
        /**
         * use capture instead of captureIfMissing to force generate the
         * better looking version.
         */
        let url = aMessage.parameters.url;
        BackgroundPageThumbs.capture(url, {
          onDone: function() {
            let path = "";
            if (PageThumbs.getThumbnailPath) {
              path = PageThumbs.getThumbnailPath(url);
            } else {
              path = PageThumbsStorage.getFilePathForURL(url);
            }
            OS.File.read(path).then(function(aData) {
              let blob = new Blob([aData], {
                type: PageThumbs.contentType
              });
              self.channel.send({
                id: aMessage.id,
                key: aMessage.key,
                data: {
                  url: url,
                  blob: blob
                }
              }, aSender);
            }, function(aError) {
              self.channel.send({
                id: aMessage.id,
                key: aMessage.key,
                data: {
                  url: url
                }
              }, aSender);
            });
          }
        });
        break;
      case "variant.channel":
        this.channel.send({
          id: aMessage.id,
          key: aMessage.key,
          data: QuickDialData.variant
        }, aSender);
        break;
    }
  }
};


let mozCNWebChannels = {
  contentURL: "chrome://ntab/content/mozCNWebChannelContent.js",
  channelID: "moz_cn_utils",
  specs: {
    "http://e.firefoxchina.cn/": "",
    "http://i.firefoxchina.cn/": "",
    "http://n.firefoxchina.cn/": "",
    "http://newtab.firefoxchina.cn/": "",
    "http://offlintab.firefoxchina.cn/": "offlintabListener"
  },
  init: function () {
    let self = this;
    Object.keys(this.specs).forEach(function(aSpec) {
      let uri = Services.io.newURI(aSpec, null, null);
      new mozCNWebChannel(self.channelID, uri, self.specs[aSpec]);
    });
    gMM.loadFrameScript(this.contentURL, true);
  }
}

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([mozCNUtils]);
