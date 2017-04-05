(function() {
  let ns = MOA.ns("URL2QR");
  XPCOMUtils.defineLazyGetter(ns, "popup", function() {
    return document.getElementById("mo-url2qr-popup");
  });
  XPCOMUtils.defineLazyGetter(ns, "popupAnchor", function() {
    return document.getElementById("mo-url2qr-icon");
  });
  XPCOMUtils.defineLazyGetter(ns, "popupImage", function() {
    return document.getElementById("mo-url2qr-image");
  });
  XPCOMUtils.defineLazyGetter(ns, "popupFx4A", function() {
    return document.getElementById("mo-url2qr-fx4a");
  });
  XPCOMUtils.defineLazyGetter(ns, "CEHomepage", function() {
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
  XPCOMUtils.defineLazyGetter(ns, "CETracking", function() {
    return Cc["@mozilla.com.cn/tracking;1"].getService().wrappedJSObject;
  });

  let PREF_KEY = "extensions.cmimprove.url2qr.enabled";

  let listener = {
    QueryInterface: function(iid) {
      if (iid.equals(Ci.nsISupports) ||
        iid.equals(Ci.nsISupportWeakReference) ||
        iid.euqals(Ci.nsIWebProgressListener)) {
        return this;
      }

      throw Cr.NS_ERROR_NO_INTERFACE;
    },

    onStateChange:    function() {},
    onProgressChange: function() {},
    onStatusChange:   function() {},
    onSecurityChange: function() {},
    onLocationChange: function(aWebProgress, aRequest, aUri) {
      let isTopLevel = aWebProgress.isTopLevel ||
                       aWebProgress.DOMWindow == aWebProgress.DOMWindow.top;

      if (!ns.enabled || !isTopLevel) {
        return;
      }

      ns.popupAnchor.hidden = !(aUri.spec == "about:cehome" ||
                                aUri.scheme == "http" ||
                                aUri.scheme == "https" ||
                                aUri.scheme == "ftp");
    }
  };

  ns.enabled = Services.prefs.getBoolPref(PREF_KEY);

  ns.observe = function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "nsPref:changed":
        if (aData == PREF_KEY) {
          ns.enabled = Services.prefs.getBoolPref(aData);
        }
        break;
    }
  };

  ns.generateGIFwithFx = function(message) {
    try {
      let { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
      let { require } = devtools;
      let QR = require("devtools/toolkit/qrcode/index");
      let Encoder = require("devtools/toolkit/qrcode/encoder/index").Encoder;

      quality = "L";
      version = QR.findMinimumVersion(message, quality);
      let encoder = new Encoder(version, quality);
      encoder.addData(message);
      encoder.make();

      /**
       * cellSize is size of each modules in pixels. 4 * 2 means a margin of
       * 4 cells on both sides of the output.
       *
       * The goal here is to make sure the output image is at least about
       * 240 x 240px and the cellSize is no less than 2px, its default value.
       */
      let altCellSize = Math.floor(240 / (encoder.getModuleCount() + 4 * 2));
      let cellSize = Math.max(2, altCellSize);
      return encoder.createImgData(cellSize);
    } catch(e) {
      return {};
    }
  };

  ns.popupShown = function() {
    let uri = gBrowser.selectedBrowser.currentURI;
    if (!uri) {
      ns.popup.hidePopup();
    }

    let text = uri.asciiSpec;
    text = {
      "about:cehome": (ns.CEHomepage.aboutpage.split("?")[0] + "?from=url2qr")
    }[text] || text;
    let datauri = ns.generateGIFwithFx(text).src || MOA.URL2QR.QRCode.generatePNG(text);
    ns.popupImage.src = datauri;
    ns.CETracking.track("url2qr-qrshown");
  };

  window.addEventListener("load", function() {
    window.setTimeout(function() {
      gBrowser.addProgressListener(listener);
      Services.prefs.addObserver("extensions.cmimprove.url2qr.", ns, false);
    }, 1000);
  }, false);
  window.addEventListener("unload", function() {
    gBrowser.removeProgressListener(listener);
    Services.prefs.removeObserver("extensions.cmimprove.url2qr.", ns);
  }, false);
})();
