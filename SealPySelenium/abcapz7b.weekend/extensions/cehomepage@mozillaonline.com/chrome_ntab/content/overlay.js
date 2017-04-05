(function() {
  var ns = MOA.ns('NTab');

  Cu.import('resource://ntab/NTabDB.jsm', ns);
  Cu.import('resource://ntab/Tracking.jsm', ns);
  if (!window.NetUtil) {
    Cu.import('resource://gre/modules/NetUtil.jsm');
  }

  function loadInExistingTabs() {
    if (!Services.prefs.getBoolPref("moa.ntab.loadInExistingTabs")) {
      return;
    }

    if (!Services.prefs.getBoolPref('moa.ntab.openInNewTab')) {
      return;
    }

    var chromehidden = document.getElementById('main-window').getAttribute('chromehidden');
    if (chromehidden.match(/menubar/))
      return;

    var tabs = gBrowser.tabContainer.childNodes;
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (!tab.hasAttribute('busy') && !tab.hasAttribute('isPermaTab')) {
        var doc = tab.linkedBrowser.contentDocument;
        if (doc && doc.location == 'about:blank') {
          doc.location = newTabPref.spec;
          tab.linkedBrowser.userTypedValue = '';
        }
      }
    }
  }

  var overrideInstallation = {
    prefKey: 'moa.ntab.oldinstalldate',

    get oldInstallDate() {
      var oldInstallDate = '';
      try {
        oldInstallDate = Services.prefs.getCharPref(this.prefKey);
      } catch(e) {}
      return oldInstallDate;
    },

    set oldInstallDate(val) {
      try {
        Services.prefs.setCharPref(this.prefKey, val);
      } catch(e) {}
    },

    get installDateFile() {
      var installDateFile = Services.dirsvc.get('XREExeF', Ci.nsILocalFile);
      installDateFile.leafName = 'distribution';
      installDateFile.append('myextensions');

      if (!installDateFile.exists() || !installDateFile.isDirectory()) {
        installDateFile = Services.dirsvc.get('CurProcD', Ci.nsILocalFile);
        installDateFile.append('distribution');
        installDateFile.append('myextensions');
      }
      installDateFile.append('installdate.ini');

      return installDateFile;
    },

    get newInstallDate() {
      var newInstallDate = '';
      var installDateFile = this.installDateFile;
      if (!installDateFile.exists() || installDateFile.isDirectory()) {
        return '';
      }

      var iniParser = Cc['@mozilla.org/xpcom/ini-parser-factory;1'].
                        getService(Ci.nsIINIParserFactory).
                        createINIParser(installDateFile);
      var sections = iniParser.getSections();
      var section = null;

      while (sections.hasMore()) {
        section = sections.getNext();
        try {
          newInstallDate += iniParser.getString(section, 'dwLowDateTime');
          newInstallDate += iniParser.getString(section, 'dwHighDateTime');
        } catch(e) {
          return '';
        }
      }

      if (!newInstallDate) {
        var fstream = Cc['@mozilla.org/network/file-input-stream;1'].
                        createInstance(Ci.nsIFileInputStream);
        fstream.init(installDateFile, -1, 0, 0);
        newInstallDate = NetUtil.readInputStreamToString(fstream, fstream.available());
      }

      return newInstallDate;
    },

    get isOverride() {
      var everSet = !!this.oldInstallDate;
      var changed = this.oldInstallDate != this.newInstallDate;
      if (!changed) {
        delete this.isOverride;
        return this.isOverride = false;
      }

      this.oldInstallDate = this.newInstallDate;
      // only a change with an exisiting pref count as an override
      delete this.isOverride;
      return this.isOverride = everSet;
    }
  };

  var homepageReset = {
    prefKeyHomepage: "browser.startup.homepage",
    prefKeyOtherNav: "moa.homepagereset.othernav.latestcheck",
    prefKeyPotentialHijack: "moa.homepagereset.potentialhijack.",

    notificationKey: "mo-reset-cehome",

    NO_REASON: 0,
    REASON_OVERRIDE_INSTALL: 1,
    REASON_OTHER_NAV: 2,
    REASON_POTENTIAL_HIJACK: 3,

    defaultHomepage: "about:cehome",
    defaultHomepages: [
      /^about:cehome$/,
      /^http:\/\/[a-z]+\.firefoxchina\.cn/
    ],

    otherNavs: [
      /^http:\/\/www\.hao123\.com/,
      /^http:\/\/www\.2345\.com/
    ],
    firstOtherNavUrl: null,

    get homepage() {
      var homepages = [this.defaultHomepage];
      try {
        homepages = Services.prefs.getComplexValue(this.prefKeyHomepage,
          Ci.nsIPrefLocalizedString).data.split("|");
      } catch(e) {}
      return homepages;
    },

    set homepage(homepage) {
      var defaultHomepages = [homepage];
      try {
        defaultHomepages = Services.prefs.getDefaultBranch("").
          getComplexValue(this.prefKeyHomepage,
            Ci.nsIPrefLocalizedString).data.split("|");
      } catch(e) {};

      var defaultHomepageIsCEHome =
        defaultHomepages.some(function(defaultHomepage) {
          return homepage == defaultHomepage;
        });

      if (defaultHomepageIsCEHome) {
        Services.prefs.clearUserPref(this.prefKeyHomepage);
      } else {
        try {
          Services.prefs.setCharPref(this.prefKeyHomepage, homepage);
        } catch(e) {}
      }
    },

    // for comparison, using int instead of string
    currentCheck: 20131129,

    get latestCheck() {
      var latestCheck = 0;
      try {
        latestCheck = Services.prefs.getIntPref(this.prefKeyOtherNav);
      } catch(e) {}
      return latestCheck;
    },

    set latestCheck(day) {
      try {
        Services.prefs.setIntPref(this.prefKeyOtherNav, day);
      } catch(e) {}
    },

    shouldNotify: function() {
      var homepages = this.homepage;
      var usingCEHome = this.defaultHomepages.some(function(regex) {
        return homepages.some(function(homepage) {
          return regex.test(homepage);
        });
      });

      if (usingCEHome) {
        return this.NO_REASON;
      }

      var ret = overrideInstallation.isOverride ?
        this.REASON_OVERRIDE_INSTALL :
        this.NO_REASON;

      var firstOtherNav = "";
      var usingOtherNav = this.otherNavs.some(function(regex) {
        return homepages.some(function(homepage) {
          var match = regex.test(homepage);
          if (match) {
            firstOtherNav = homepage;
          }
          return match;
        });
      });

      if (!usingOtherNav) {
        return ret;
      }

      this.firstOtherNavUrl = Services.io.newURI(firstOtherNav, null, null)
                                      .QueryInterface(Ci.nsIURL);
      if (this.firstOtherNavUrl.query) {
        var latestCheck = 0;
        try {
          var prefKey = this.prefKeyPotentialHijack + this.firstOtherNavUrl.asciiHost;
          latestCheck = Services.prefs.getIntPref(prefKey);
        } catch(e) {}
        if (latestCheck < this.currentCheck) {
          return this.REASON_POTENTIAL_HIJACK;
        } else {
          return ret;
        }
      } else {
        if (this.latestCheck < this.currentCheck) {
          return this.REASON_OTHER_NAV;
        } else {
          return ret;
        }
      }
    },

    markShown: function() {
      this.latestCheck = this.currentCheck;
    },

    markNomore: function() {
      var prefKey = this.prefKeyPotentialHijack + this.firstOtherNavUrl.asciiHost;
      try {
        Services.prefs.setIntPref(prefKey, this.currentCheck);
      } catch(e) {}
    },

    check: function() {
      var reason = this.shouldNotify();
      var shownCallback = this.markShown.bind(this);
      var nomoreCallback = this.markNomore.bind(this);

      if (reason == this.NO_REASON) {
        return;
      }

      switch (reason) {
        case this.REASON_OVERRIDE_INSTALL:
          this.notify(reason);
          break;
        case this.REASON_OTHER_NAV:
          this.notify(reason, shownCallback);
          break;
        case this.REASON_POTENTIAL_HIJACK:
          this.notify(reason, shownCallback, nomoreCallback);
          break;
        default:
          break;
      }

      ns.Tracking.track({
        type: "homepagereset",
        action: "notify",
        sid: reason
      });
    },

    notify: function(aReason, aShownCallback, aNomoreCallback) {
      var stringBundle = document.getElementById('ntab-strings');

      var message = stringBundle.getString("homepagereset.notification.message");
      if (aReason == this.REASON_POTENTIAL_HIJACK) {
        message = stringBundle.getString("homepagereset.notification.message_alt");
      }
      var resetText = stringBundle.getString("homepagereset.notification.reset");
      var noText = stringBundle.getString("homepagereset.notification.no");
      var nomoreText = stringBundle.getString("homepagereset.notification.nomore");

      var self = this;
      var buttons = [{
        label: resetText,
        accessKey: "R",
        callback: function() {
          self.reset();

          ns.Tracking.track({
            type: "homepagereset",
            action: "click",
            sid: "yes"
          });
        }
      }, {
        label: noText,
        accessKey: "N",
        callback: function() {
          ns.Tracking.track({
            type: "homepagereset",
            action: "click",
            sid: "no"
          });
        }
      }];

      if (aNomoreCallback) {
        buttons.push({
          label: nomoreText,
          accessKey: "D",
          callback: function() {
            aNomoreCallback();

            ns.Tracking.track({
              type: "homepagereset",
              action: "click",
              sid: "nomore"
            });
          }
        });
      }

      var notificationBox = gBrowser.getNotificationBox();
      var notificationBar =
        notificationBox.appendNotification(message, this.notificationKey, "",
          notificationBox.PRIORITY_INFO_MEDIUM, buttons);
      if (aShownCallback) {
        aShownCallback();
      }
      notificationBar.persistence = -1;
    },

    reset: function() {
      this.homepage = this.defaultHomepage;
    }
  }

  var newTabPref = {
    _appPreloadKey: 'browser.newtab.preload',
    _appUrlKey: 'browser.newtab.url',
    extPrefKey: 'moa.ntab.openInNewTab',

    inUse: true,

    get altSpec() {
      Services.prefs.addObserver(ns.NTabDB.altSpecPref, this, false);

      delete this.altSpec;
      return this.altSpec = this.getAltSpec();
    },
    get specKey() {
      delete this.specKey;
      return this.specKey = PrivateBrowsingUtils.isWindowPrivate(window) ?
        'privateSpec' : 'spec';
    },
    get spec() {
      return this.altSpec || ns.NTabDB[this.specKey];
    },

    getAltSpec: function() {
      var altSpec = ns.NTabDB.getAltSpec();
      if (altSpec && gInitialPages.indexOf(altSpec) < 0) {
        gInitialPages.push(altSpec);
      }
      return altSpec;
    },

    init: function() {
      Services.prefs.addObserver(this.extPrefKey, this, false);
      this.refresh();

      gInitialPages = gInitialPages.concat([
        ns.NTabDB.spec, ns.NTabDB.privateSpec, ns.NTabDB.readOnlySpec
      ]);
    },

    observe: function(aSubject, aTopic, aData) {
      if (aTopic == 'nsPref:changed') {
        switch (aData) {
          case ns.NTabDB.altSpecPref:
            newTabPref.altSpec = newTabPref.getAltSpec();
            // intentionally no break
          case newTabPref.extPrefKey:
            newTabPref.refresh();
            break;
        }
      }
    },

    refresh: function() {
      this.inUse = Services.prefs.getBoolPref(this.extPrefKey);
      /*
       * if using offlintab (different urls for pb/non-pb window):
       * set browser.newtab.url to (this.altSpec || ns.NTabDB.spec) instead of
       * this.spec to prevent updating BROWSER_NEW_TAB_URL in every window based
       * on the most recently opened window.
       *
       * if not using offlintab:
       * set browser.newtab.url on default branch to make sure
       * about:privatebrowsing will be opened in (non-permanent) pb mode.
       *
       * see http://dxr.mozilla.org/mozilla-central/search?q=getNewTabPageURL
       */
      if (this.inUse) {
        let spec = this.altSpec || ns.NTabDB.spec;
        if (window.aboutNewTabService) {
          aboutNewTabService.newTabURL = spec;
        } else if (window.NewTabURL && NewTabURL.override) {
          NewTabURL.override(spec);
        } else {
          Services.prefs.getDefaultBranch("").
            setCharPref(this._appUrlKey, spec);
          Services.prefs.getDefaultBranch("").
            setBoolPref(this._appPreloadKey, false);
          try {
            Services.prefs.clearUserPref(this._appUrlKey);
            Services.prefs.clearUserPref(this._appPreloadKey);
          } catch(e) {};
        }
      } else {
        if (window.aboutNewTabService) {
          aboutNewTabService.resetNewTabURL();
        } else if (window.NewTabURL && NewTabURL.reset) {
          NewTabURL.reset();
        } else {
          if (!Services.prefs.prefHasUserValue(this._appUrlKey)) {
            Services.prefs.getDefaultBranch("").
              setCharPref(this._appUrlKey, "about:newtab");
            Services.prefs.getDefaultBranch("").
              setBoolPref(this._appPreloadKey, true);
          }
        }
      }
    }
  };

  var permanentPB = {
    prefKey: "moa.permanent-pb.notify",
    notificationKey: "mo-permanent-pb",

    get shouldNotify() {
      var shouldNotify = true;
      try {
        shouldNotify = Services.prefs.getBoolPref(this.prefKey);
      } catch(e) {}
      return shouldNotify;
    },

    set shouldNotify(aShouldNotify) {
      try {
        Services.prefs.setBoolPref(this.prefKey, !!aShouldNotify);
      } catch(e) {}
    },

    notify: function() {
      if (!this.shouldNotify) {
        return;
      }

      var stringBundle = document.getElementById('ntab-strings');

      var message = stringBundle.getString("permanent-pb.notification.message");
      var yesText = stringBundle.getString("permanent-pb.notification.yes");
      var moreText = stringBundle.getString("permanent-pb.notification.more");

      var self = this;
      var buttons = [{
        label: yesText,
        accessKey: "Y",
        callback: function() {
          self.disablePBAutoStart();

          self.shouldNotify = false;
          ns.Tracking.track({
            type: "permanent-pb",
            action: "click",
            sid: "yes"
          });
        }
      }, {
        label: moreText,
        accessKey: "M",
        callback: function() {
          window.openPreferences("panePrivacy");

          self.shouldNotify = false;
          ns.Tracking.track({
            type: "permanent-pb",
            action: "click",
            sid: "more"
          });
        }
      }];

      var notificationBox = gBrowser.getNotificationBox();
      var notificationBar =
        notificationBox.appendNotification(message, this.notificationKey,
          "chrome://browser/skin/Privacy-16.png",
          notificationBox.PRIORITY_INFO_MEDIUM, buttons);
      // persist across the about:blank -> newTabPref.spec change
      notificationBar.persistence = 1;

      ns.Tracking.track({
        type: "permanent-pb",
        action: "notify",
        sid: "shown"
      });
    },

    disablePBAutoStart: function() {
      Services.prefs.setBoolPref("browser.privatebrowsing.autostart", false);

      var brandName = document.getElementById("bundle_brand").
                               getString("brandShortName");
      var bundle = Services.strings.createBundle(
        "chrome://browser/locale/preferences/preferences.properties");
      var msg = bundle.formatStringFromName("featureDisableRequiresRestart",
                                            [brandName], 1);
      var title = bundle.formatStringFromName("shouldRestartTitle",
                                              [brandName], 1);
      var shouldProceed = Services.prompt.confirm(window, title, msg)
      if (shouldProceed) {
        var cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].
                           createInstance(Ci.nsISupportsPRBool);
        Services.obs.notifyObservers(cancelQuit, "quit-application-requested",
                                     "restart");
        shouldProceed = !cancelQuit.data;

        if (shouldProceed) {
          let appStartup = Cc["@mozilla.org/toolkit/app-startup;1"].
                             getService(Ci.nsIAppStartup);
          appStartup.quit(Ci.nsIAppStartup.eAttemptQuit |
                          Ci.nsIAppStartup.eRestart);
        }
      }
    }
  };

  ns.browserOpenTab = function(event) {
    if (newTabPref.inUse) {
      var spec = newTabPref.spec;
      openUILinkIn(spec, 'tab');

      // focus automatically for cases not covered by openUILinkIn
      if (!isBlankPageURL(spec)) {
        focusAndSelectUrlBar();
      }

      if (PrivateBrowsingUtils.isWindowPrivate(window) &&
          PrivateBrowsingUtils.permanentPrivateBrowsing &&
          !newTabPref.altSpec) {
        permanentPB.notify();
      }

      ns.Tracking.track({
        type: "opentab",
        action: "click",
        sid: "ntab"
      });
    } else {
      window.originalBrowserOpenTab(event);

      ns.Tracking.track({
        type: "opentab",
        action: "click",
        sid: "newtab"
      });
    }
  };

  ns.onLoad = function() {
    // load ntab page in existing empty tabs.
    // Under Firefox5, this function will open "about:ntab" in the blank page in which
    // the welcome page is opened.
    // So set an timeout to run this function, make sure welcome page will be opened.
    setTimeout(function() {
      loadInExistingTabs();
    }, 1000);

    // Catch new tab
    if (window.TMP_BrowserOpenTab) {
      gBrowser.removeEventListener('NewTab', window.TMP_BrowserOpenTab, true);
      gBrowser.removeEventListener('NewTab', window.BrowserOpenTab, true);
      window.originalBrowserOpenTab = window.TMP_BrowserOpenTab;
      window.BrowserOpenTab = window.TMP_BrowserOpenTab = MOA.NTab.browserOpenTab;
      gBrowser.addEventListener('NewTab', window.BrowserOpenTab, true);
    } else if (window.TBP_BrowserOpenTab) {
      gBrowser.removeEventListener('NewTab', window.TBP_BrowserOpenTab, true);
      window.originalBrowserOpenTab = window.TBP_BrowserOpenTab;
      window.TBP_BrowserOpenTab = MOA.NTab.browserOpenTab;
      gBrowser.addEventListener('NewTab', window.TBP_BrowserOpenTab, true);
    } else {
      gBrowser.removeEventListener('NewTab', window.BrowserOpenTab, false);
      window.originalBrowserOpenTab = window.BrowserOpenTab;
      window.BrowserOpenTab = MOA.NTab.browserOpenTab;
      gBrowser.addEventListener('NewTab', window.BrowserOpenTab, false);
    }

    newTabPref.init();
    homepageReset.check();
  };

  ns.onMenuItemCommand = function(event) {
    if (event.target.tagName != 'menuitem')
      return;
    var url, title;
    url = gContextMenu.linkURL;
    if (url) {
      title = gContextMenu.linkText();
    } else {
      url = gBrowser.selectedBrowser.currentURI.spec;
      title = gBrowser.selectedTab.label;
    }

    ns.Tracking.track({
      type: 'context-menu',
      action: 'add-to-qd',
      sid: 'attempt'
    });

    var stringBundle = document.getElementById('ntab-strings');

    if (!isValidURI(url)) {
      Services.prompt.alert(null,
        stringBundle.getString('ntab.contextmenu.title'),
        stringBundle.getString('ntab.contextmenu.invalidurl'));
      return;
    }

    ns.NTabDB.fillBlankDial({
      title: title,
      url: url
    }, function(aIndex) {
      if (aIndex > 0) {
        Services.prompt.alert(null,
          stringBundle.getString('ntab.contextmenu.title'),
          stringBundle.getFormattedString('ntab.contextmenu.addedtodial', [aIndex]));

        ns.Tracking.track({
          type: 'context-menu',
          action: 'add-to-qd',
          sid: 'success'
        });
      } else {
        Services.prompt.alert(null,
          stringBundle.getString('ntab.contextmenu.title'),
          stringBundle.getString('ntab.contextmenu.noblankdial'));
      }
    });
  };

  var isValidURI = function (aURI) {
    try {
      Services.scriptSecurityManager.
        checkLoadURIStrWithPrincipal(ns.NTabDB.principal,
          aURI,
          Ci.nsIScriptSecurityManager.DISALLOW_INHERIT_PRINCIPAL |
          Ci.nsIScriptSecurityManager.DONT_REPORT_ERRORS);
      return true;
    } catch(e) {
      return false;
    }
  };

  ns.onKeydown = function(evt) {
    if (Services.prefs.getBoolPref('moa.ntab.display.usehotkey') &&
      evt.ctrlKey && 48 < evt.keyCode && evt.keyCode <= 57) {

      ns.Tracking.track({
        type: 'shortcut',
        action: 'open-qd',
        sid: 'attempt'
      });

      evt.preventDefault();
      evt.stopPropagation();
      var index = evt.keyCode - 48 || 10;
      ns.NTabDB.getDial(index, function(aEvt) {
        var dial = aEvt.target && aEvt.target.result;

        if(dial && dial.url) {
          openUILinkIn(dial.url, 'tab');

          ns.Tracking.track({
            type: 'shortcut',
            action: 'open-qd',
            sid: 'success'
          });
        }
      });
    }
  };

  ns.onContextMenuGlobal = function() {
    var hidden = !Services.prefs.getBoolPref('moa.ntab.contextMenuItem.show') ||
      gInitialPages.indexOf(gBrowser.selectedBrowser.currentURI.spec) > -1 ||
      PrivateBrowsingUtils.isWindowPrivate(window);
    document.getElementById('context-ntab').hidden = hidden;
  };

  ns.isValidURI = isValidURI;
})();

window.addEventListener("load", function() {
  window.setTimeout(function() {
    MOA.NTab.onLoad();
    gBrowser.addEventListener("contextmenu", MOA.NTab.onContextMenuGlobal, false);
    window.addEventListener("keydown", MOA.NTab.onKeydown, true);
  }, 1);
}, false);
