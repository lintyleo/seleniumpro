/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function () { // bug 673569 workaround :(

var { classes: Cc, interfaces: Ci, utils: Cu } = Components;

// MO changes, compatible with older Fx release
try {
  Cu.importGlobalProperties(['Blob']);
  Cu.importGlobalProperties(['FileReader']);
} catch(e) {};
try {
  Cu.import("resource://gre/modules/PageThumbUtils.jsm");
} catch(e) {
  Cu.import("resource://gre/modules/PageThumbs.jsm");
}

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

const STATE_LOADING = 1;
const STATE_CAPTURING = 2;
const STATE_CANCELED = 3;

const backgroundPageThumbsContent = {

  init: function () {
    Services.obs.addObserver(this, "document-element-inserted", true);

    // We want a low network priority for this service - lower than b/g tabs
    // etc - so set it to the lowest priority available.
    this._webNav.QueryInterface(Ci.nsIDocumentLoader).
      loadGroup.QueryInterface(Ci.nsISupportsPriority).
      priority = Ci.nsISupportsPriority.PRIORITY_LOWEST;

    // MO changes, compatible with older Fx release
    try {
      docShell.allowMedia = false;
      docShell.allowPlugins = false;
      docShell.allowContentRetargeting = false;
      let defaultFlags = Ci.nsIRequest.LOAD_ANONYMOUS |
                         Ci.nsIRequest.LOAD_BYPASS_CACHE |
                         Ci.nsIRequest.INHIBIT_CACHING |
                         Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_HISTORY;
      docShell.defaultLoadFlags = defaultFlags;
    } catch(e) {}

    addMessageListener("BackgroundPageThumbs:capture",
                       this._onCapture.bind(this));
    docShell.
      QueryInterface(Ci.nsIInterfaceRequestor).
      getInterface(Ci.nsIWebProgress).
      addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_WINDOW);
  },

  observe: function (subj, topic, data) {
    // Arrange to prevent (most) popup dialogs for this window - popups done
    // in the parent (eg, auth) aren't prevented, but alert() etc are.
    // disableDialogs only works on the current inner window, so it has
    // to be called every page load, but before scripts run.
    if (content && subj == content.document) {
      // MO changes, compatible with older Fx release
      let utils = content.
        QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowUtils);

      try {
        utils.disableDialogs();
      } catch(e) {
        utils.preventFurtherDialogs();
      }
    }
  },

  get _webNav() {
    return docShell.QueryInterface(Ci.nsIWebNavigation);
  },

  _onCapture: function (msg) {
    this._nextCapture = {
      id: msg.data.id,
      url: msg.data.url,
    };
    if (this._currentCapture) {
      if (this._state == STATE_LOADING) {
        // Cancel the current capture.
        this._state = STATE_CANCELED;
        this._loadAboutBlank();
      }
      // Let the current capture finish capturing, or if it was just canceled,
      // wait for onStateChange due to the about:blank load.
      return;
    }
    this._startNextCapture();
  },

  _startNextCapture: function () {
    if (!this._nextCapture)
      return;
    this._currentCapture = this._nextCapture;
    delete this._nextCapture;
    this._state = STATE_LOADING;
    this._currentCapture.pageLoadStartDate = new Date();
    try {
      this._webNav.loadURI(this._currentCapture.url,
                           Ci.nsIWebNavigation.LOAD_FLAGS_STOP_CONTENT,
                           null, null, null);
    } catch(e) {
      this._failCurrentCapture("BAD_URI");
      delete this._currentCapture;
      this._startNextCapture();
    }
  },

  // MO changes, for non-http redirect
  _refreshTimer: null,

  _refreshLog: function (msg) {
    Services.console.logStringMessage("[refresh] " + msg + ": " +
      (new Date() - this._currentCapture.pageLoadStartDate) + " " +
      this._currentCapture.url + " => " +
      this._webNav.currentURI.spec);
  },

  onStateChange: function (webProgress, req, flags, status) {
    // MO changes, got a non-http redirect
    if (this._refreshTimer && webProgress.isTopLevel &&
        (flags & Ci.nsIWebProgressListener.STATE_START)) {
      this._refreshLog(" got");
      content.clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    if (webProgress.isTopLevel &&
        (flags & Ci.nsIWebProgressListener.STATE_STOP) &&
        this._currentCapture) {
      if (req.name == "about:blank") {
        if (this._state == STATE_CAPTURING) {
          // about:blank has loaded, ending the current capture.
          this._finishCurrentCapture();
          delete this._currentCapture;
          this._startNextCapture();
        }
        else if (this._state == STATE_CANCELED) {
          delete this._currentCapture;
          this._startNextCapture();
        }
      }
      // MO changes, kinda conflict with non-http redirect detection?
      else if (this._state == STATE_LOADING/* &&
               Components.isSuccessCode(status)*/) {
        if (req.status == Components.results.NS_ERROR_REDIRECT_LOOP) {
          this._refreshLog("loop");
        }

        // MO changes, a short delay for potential non-http redirect
        this._refreshLog("wait");
        this._refreshTimer = content.setTimeout(() => {
          this._refreshTimer = null;
          // The requested page has loaded.  Capture it.
          this._state = STATE_CAPTURING;
          this._captureCurrentPage();
        }, 25);
      }
      else if (this._state != STATE_CANCELED) {
        // Something went wrong.  Cancel the capture.  Loading about:blank
        // while onStateChange is still on the stack does not actually stop
        // the request if it redirects, so do it asyncly.
        this._state = STATE_CANCELED;
        if (!this._cancelTimer) {
          this._cancelTimer =
            Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
          this._cancelTimer.init(() => {
            this._loadAboutBlank();
            delete this._cancelTimer;
          }, 0, Ci.nsITimer.TYPE_ONE_SHOT);
        }
      }
    }
  },

  _captureCurrentPage: function () {
    let capture = this._currentCapture;
    capture.finalURL = this._webNav.currentURI.spec;
    capture.pageLoadTime = new Date() - capture.pageLoadStartDate;

    let canvasDrawDate = new Date();
    // MO changes, for <https://bugzil.la/1197361>
    let canvas,
        finalCanvas;
    // MO changes, for <https://bugzil.la/698371>
    try {
      if (PageThumbUtils.createSnapshotThumbnail) {
        finalCanvas = PageThumbUtils.createSnapshotThumbnail(content, null);
      } else {
        canvas = PageThumbUtils.createCanvas(content);
        let [sw, sh, scale] = PageThumbUtils.determineCropSize(content, canvas);

        let ctx = canvas.getContext("2d");
        ctx.save();
        ctx.scale(scale, scale);
        ctx.drawWindow(content, 0, 0, sw, sh,
                       PageThumbUtils.THUMBNAIL_BG_COLOR,
                       ctx.DRAWWINDOW_DO_NOT_FLUSH);
        ctx.restore();
      }
    } catch(e) {
      // MO changes, for <https://bugzil.la/1058237>
      canvas = PageThumbs.createCanvas ?
        PageThumbs.createCanvas(content) : PageThumbs._createCanvas(content);
      PageThumbs._captureToCanvas(content, canvas);
    }
    capture.canvasDrawTime = new Date() - canvasDrawDate;

    (finalCanvas || canvas).toBlob(blob => {
      // MO changes, for <https://bugzil.la/1047483>
      try {
        capture.imageBlob = new Blob([blob]);
      } catch(e) {
        capture.imageBlob = blob;
      }
      // Load about:blank to finish the capture and wait for onStateChange.
      this._loadAboutBlank();
    });
  },

  _finishCurrentCapture: function () {
    let capture = this._currentCapture;
    let fileReader;
    // MO changes, for <https://bugzil.la/1231100>
    try {
      fileReader = new FileReader();
    } catch(e) {
      fileReader = Cc["@mozilla.org/files/filereader;1"].
                   createInstance(Ci.nsIDOMFileReader);
    }
    fileReader.onloadend = () => {
      sendAsyncMessage("BackgroundPageThumbs:didCapture", {
        id: capture.id,
        imageData: fileReader.result,
        finalURL: capture.finalURL,
        telemetry: {
          CAPTURE_PAGE_LOAD_TIME_MS: capture.pageLoadTime,
          CAPTURE_CANVAS_DRAW_TIME_MS: capture.canvasDrawTime,
        },
      });
    };
    fileReader.readAsArrayBuffer(capture.imageBlob);
  },

  _failCurrentCapture: function(reason) {
    let capture = this._currentCapture;
    sendAsyncMessage("BackgroundPageThumbs:didCapture", {
      id: capture.id,
      failReason: reason,
    });
  },

  // We load about:blank to finish all captures, even canceled captures.  Two
  // reasons: GC the captured page, and ensure it can't possibly load any more
  // resources.
  _loadAboutBlank: function _loadAboutBlank() {
    this._webNav.loadURI("about:blank",
                         Ci.nsIWebNavigation.LOAD_FLAGS_STOP_CONTENT,
                         null, null, null);
  },

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIWebProgressListener,
    Ci.nsISupportsWeakReference,
    Ci.nsIObserver,
  ]),
};

backgroundPageThumbsContent.init();

})();
