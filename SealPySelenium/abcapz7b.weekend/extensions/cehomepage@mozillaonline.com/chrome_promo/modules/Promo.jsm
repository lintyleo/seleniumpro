var EXPORTED_SYMBOLS = ["Promo"];

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "clearTimeout",
  "resource://gre/modules/Timer.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "CommonUtils",
  "resource://services-common/utils.js");
XPCOMUtils.defineLazyModuleGetter(this, "OS",
  "resource://gre/modules/osfile.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Preferences",
  "resource://gre/modules/Preferences.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "setTimeout",
  "resource://gre/modules/Timer.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Tracking",
  "resource://ntab/Tracking.jsm");
XPCOMUtils.defineLazyGetter(this, "CETracking", function() {
  try {
    return Cc["@mozilla.com.cn/tracking;1"].getService().wrappedJSObject;
  } catch(e) {};
});

const prefs = new Preferences("extensions.cehp.promo.");
const strings = Services.strings.createBundle(
  "chrome://cehp-promo/locale/promo.properties");

let Promo = {
  alerts: [],
  path: OS.Path.join(OS.Constants.Path.profileDir, "ntab", "promo.json"),

  minTime:      1415523600000, //2014-11-09T09:00:00.000Z
  minAlertTime: 1415635200000, //2014-11-10T16:00:00.000Z
  maxAlertTime: 1415721600000, //2014-11-11T16:00:00.000Z
  maxTime:      1415743200000, //2014-11-11T22:00:00.000Z

  get earliestNext() {
    let ret = prefs.get("earliestNext", (this.minAlertTime / 60e3));
    if (ret >= (this.maxAlertTime / 60e3)) {
      return Infinity;
    } else {
      return ret * 60e3;
    }
  },
  set earliestNext(aEarliest) {
    prefs.set("earliestNext", Math.round(aEarliest / 60e3));
  },

  ALERT: 1,
  PANEL: 2,
  get enabled() {
    return this.localEnabled & this.remoteEnabled;
  },
  get localEnabled() {
    return prefs.get("enabled.local", (this.ALERT | this.PANEL));
  },
  set localEnabled(aEnabled) {
    prefs.set("enabled.local", aEnabled);
  },
  get remoteEnabled() {
    return prefs.get("enabled.remote", (this.ALERT | this.PANEL));
  },
  set remoteEnabled(aEnabled) {
    prefs.set("enabled.remote", aEnabled);
  },

  get notifier() {
    delete this.notifier;
    return this.notifier = Cc["@mozilla.org/alerts-service;1"].
      getService(Ci.nsIAlertsService);
  },
  get timer() {
    delete this.timer;
    return this.timer = Cc["@mozilla.org/timer;1"].
      createInstance(Ci.nsITimer);
  },

  forEachBrowser: function(aCallback, aThis) {
    let windowEnumerator = Services.wm.getEnumerator("navigator:browser");
    while (windowEnumerator.hasMoreElements()) {
      try {
        aCallback.call(aThis, windowEnumerator.getNext());
      } catch(e) {};
    }
  },

  handleEvent: function(aEvt) {
    Tracking.track({
      type: "promo",
      action: "unload",
      sid: "201411",
      fid: this.ALERT
    });
    prefs.set("alert.unload", prefs.get("alert.unload", 0) + 1);
  },

  hidePanel: function(aWindow) {
    let icon = aWindow.document.getElementById("cehpPromoIcon");
    icon.removeAttribute("data-hidden");
    icon.hidden = true;
  },

  init: function() {
    if (Date.now() < this.minTime) {
      return;
    }
    if (Date.now() > this.maxTime) {
      this.maybeSendStats();
      return;
    }

    this.initAlerts();

    this.notify();
    this.timer.initWithCallback(this, (15 * 60e3),
      Ci.nsITimer.TYPE_REPEATING_PRECISE_CAN_SKIP);

    Services.obs.addObserver(this, "browser-delayed-startup-finished", false);
    prefs.observe("enabled.", this);
  },

  initAlerts: function() {
    let self = this;
    OS.File.exists(this.path).then(function(aExists) {
      if (aExists) {
        CommonUtils.readJSON(self.path).then(function(aJSON) {
          self.alerts = aJSON;
        });
      }

      let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
        createInstance(Ci.nsIXMLHttpRequest);
      let url = "http://newtab.firefoxchina.cn/res/tmall/1067_1.json";
      xhr.open("GET", url, true);
      xhr.onload = function(evt) {
        if (xhr.status == 200) {
          let data = JSON.parse(xhr.responseText).data;
          self.alerts = data;
          CommonUtils.writeJSON(data, self.path);
        }
      };
      xhr.send();
    });
  },

  initPanel: function(aWindow) {
    if (!(this.enabled & this.PANEL)) {
      return;
    }

    let self = this;
    let doc = aWindow.document;
    let setBrowserSrc = function() {
      popup.removeEventListener("popupshowing", setBrowserSrc, false);

      let url = "http://newtab.firefoxchina.cn/tmall-tab-rec.html";
      let browser = doc.getElementById("cehpPromoBrowser");
      if (browser.currentURI.spec !== url) {
        browser.setAttribute("src", url);
      }
    };
    // wait (arbitrary) 30s before preloading the browser to reduce visual delay
    setTimeout(setBrowserSrc, 30e3);

    let popup = doc.getElementById("cehpPromoPopup");
    popup.addEventListener("popupshowing", setBrowserSrc, false);
    popup.addEventListener("popupshown", function() {
      Tracking.track({
        type: "promo",
        action: "shown",
        sid: "201411",
        fid: self.PANEL
      });
    }, false);

    let nomore = doc.getElementById("cehpPromoNoMore");
    nomore.addEventListener("click", function() {
      if (Services.prompt.confirm(aWindow,
            strings.GetStringFromName("disable.confirm.title"),
            strings.GetStringFromName("disable.confirm.text"))) {

        self.localEnabled &= ~self.PANEL;
        Tracking.track({
          type: "promo",
          action: "disable",
          sid: "201411",
          fid: self.PANEL
        });
      }
    }, false);

    let icon = doc.getElementById("cehpPromoIcon");
    icon.addEventListener("mouseenter", function() {
      let timeout = setTimeout(function() {
        icon.removeAttribute("data-timeout");
        if (popup.state === "closed") {
          popup.openPopup(icon, "bottomcenter topright");
        }
      }, 500);
      icon.setAttribute("data-timeout", timeout);
    }, false);
    icon.addEventListener("mouseleave", function() {
      if (icon.hasAttribute("data-timeout")) {
        clearTimeout(parseInt(icon.getAttribute("data-timeout"), 10));
      }
    }, false);
    icon.setAttribute("data-hidden", "false");
    icon.hidden = false;
  },

  initProgressListener: function(aWindow) {
    // always initialize in the target timeframe for instant enable/disable
    aWindow.gBrowser.addProgressListener(this);
  },

  isECommerce: function(aURI) {
    try {
      return [
        "amazon.cn",
        "dangdang.com",
        "dianping.com",
        "etao.com",
        "gome.com.cn",
        "jd.com",
        "jumei.com",
        "lefeng.com",
        "meituan.com",
        "smzdm.com",
        "suning.com",
        "taobao.com",
        "tmall.com",
        "yhd.com",
        "yixun.com",
        "zhe800.com"
      ].indexOf(Services.eTLD.getBaseDomain(aURI)) > -1;
    } catch(e) {
      return false;
    }
  },

  isFirefoxChina: function(aURI) {
    try {
      return Services.eTLD.getBaseDomain(aURI) == "firefoxchina.cn";
    } catch(e) {
      return aURI.spec.startsWith("about:cehome");
    }
  },

  maybeSendStats: function() {
    let branch = "alert.";
    try {
      ["click", "disable", "unload"].forEach(function(aKey) {
        let val = prefs.get((branch + aKey), 0);
        if (CETracking && val) {
          CETracking.trackPrefs("promo-201411-" + aKey, val.toString());
        }
      });
    } catch(e) {}

    prefs.resetBranch(branch);
  },

  notify: function() {
    if (Date.now() > this.maxTime) {
      this.timer.cancel();
      return;
    }

    let self = this;
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
      createInstance(Ci.nsIXMLHttpRequest);
    xhr.open("GET", "http://promo.firefoxchina.cn/201411.json", true);
    xhr.onload = function(evt) {
      if (xhr.status == 200) {
        let data = JSON.parse(xhr.responseText);
        self.remoteEnabled = data.enabled;
      }
    };
    xhr.send();
  },

  observe: function(aSubject, aTopic, aData) {
    let self = this;
    switch (aTopic) {
      case "alertshow":
        let alertWin = Services.wm.getMostRecentWindow("alert:alert");
        if (alertWin) {
          let doc = alertWin.document;

          let noMore = doc.getElementById("cehpPromoNoMore");
          noMore.addEventListener("click", function(aEvt) {
            aEvt.stopPropagation();
            self.localEnabled &= ~self.ALERT;
            Tracking.track({
              type: "promo",
              action: "disable",
              sid: "201411",
              fid: self.ALERT
            });
            prefs.set("alert.disable", prefs.get("alert.disable", 0) + 1);
            alertWin.close();
          }, false, false);

          let alertBox = doc.getElementById("alertBox");
          alertBox.classList.add("cehpPromo");
          alertBox.classList.add(Services.appinfo.OS.toLowerCase());
          alertWin.addEventListener("unload", this, false);

          alertWin.sizeToContent();
        };
        break;
      case "alertclickcallback":
        let win = Services.wm.getMostRecentWindow("navigator:browser");
        win.openUILinkIn(aData, "tab");
        Tracking.track({
          type: "promo",
          action: "click",
          sid: "201411",
          fid: self.ALERT,
          href: aData
        });
        prefs.set("alert.click", prefs.get("alert.click", 0) + 1);
        break;
      case "browser-delayed-startup-finished":
        this.initPanel(aSubject);
        this.initProgressListener(aSubject);
        break;
      case "nsPref:changed":
        this.updatePanels();
        break;
    }
  },

  onLocationChange: function(aWebProgress, aRequest, aLocation, aFlags) {
    if (!aWebProgress.isTopLevel || !(aLocation instanceof Ci.nsIURI) ||
        aFlags || !this.enabled) {
      return;
    }

    this.toggleIcon(aWebProgress.chromeEventHandler, aLocation);

    if (!this.isECommerce(aLocation) ||
        !(this.enabled & this.ALERT)) {
      return;
    }
    /**
     * aRequest is known to be null if:
     * 1. triggered by switching tab
     * 2. triggered by hash change (LOCATION_CHANGE_SAME_DOCUMENT)
     * 3. ?
     */
    if (aRequest === null) {
      return;
    }

    this.showAlert();
  },

  randomAlert: function() {
    try {
      let index = Math.floor(Math.random() * this.alerts.length);
      return this.alerts[index];
    } catch(e) {}
  },

  showAlert: function() {
    if (Date.now() < this.earliestNext) {
      return;
    }

    let randomAlert = this.randomAlert();
    if (!randomAlert) {
      return;
    }

    let img = randomAlert.imgurl;
    let title = randomAlert.title;
    let text = randomAlert.intro.split(",")[0];
    let url = randomAlert.url;
    let tag = Date.now();

    try {
      let key = "alert.text." + Services.appinfo.OS.toLowerCase();
      text = strings.formatStringFromName(key, [text], 1);
    } catch(e) {}

    this.notifier.showAlertNotification(img, title, text, true, url, this, tag);
    this.earliestNext = Date.now() + 2 * 3600e3;
  },

  toggleIcon: function(aBrowser, aLocation) {
    if (!aBrowser) {
      return;
    }

    let icon = aBrowser.ownerDocument.getElementById("cehpPromoIcon");
    if (this.isECommerce(aLocation) || this.isFirefoxChina(aLocation)) {
      icon.hidden = JSON.parse(icon.getAttribute("data-hidden") || "true");
    } else {
      icon.hidden = true;
    }
  },

  updatePanels: function() {
    if (this.enabled & this.PANEL) {
      return;
    }

    this.forEachBrowser(this.hidePanel, this);
  }
};
