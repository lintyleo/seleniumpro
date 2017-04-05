let EXPORTED_SYMBOLS = ["NTabDB"];

const {
  Constructor: CC,
  classes: Cc, interfaces: Ci, results: Cr, utils: Cu
} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "FileUtils",
  "resource://gre/modules/FileUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "OS",
  "resource://gre/modules/osfile.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PageThumbs",
  "resource://gre/modules/PageThumbs.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PageThumbsStorage",
  "resource://gre/modules/PageThumbs.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "getPref",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "QuickDialData",
  "resource://ntab/QuickDialData.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Tracking",
  "resource://ntab/Tracking.jsm");

if (!this.indexedDB) {
  if (Cu.importGlobalProperties) {
    Cu.importGlobalProperties(["indexedDB"]);
  } else {
    let idbManager = Cc["@mozilla.org/dom/indexeddb/manager;1"].
      getService(Ci.nsIIndexedDatabaseManager);
    idbManager.initWindowless(this);
  }
}

let NTabDB = {
  _db: null,
  _cbQuery: "?cachebust=20150714",
  altSpecPref: "moa.ntab.web.alturl",
  prePath: "http://offlintab.firefoxchina.cn",
  get spec() {
    delete this.spec;
    return this.spec = this.prePath + "/" + this._cbQuery;
  },
  get privateSpec() {
    delete this.privateSpec;
    return this.privateSpec = this.prePath + "/private.html" + this._cbQuery;
  },
  get readOnlySpec() {
    delete this.readOnlySpec;
    return this.readOnlySpec = this.prePath + "/readonly.html" + this._cbQuery;
  },
  get uri() {
    delete this.uri;
    return this.uri = Services.io.newURI(this.spec, null, null);
  },
  get privateUri() {
    delete this.privateUri;
    return this.privateUri = Services.io.newURI(this.privateSpec, null, null);
  },
  get readOnlyUri() {
    delete this.readOnlyUri;
    return this.readOnlyUri = Services.io.newURI(this.readOnlySpec, null, null);
  },
  get principal() {
    delete this.principal;
    return this.principal = Services.scriptSecurityManager.
      getNoAppCodebasePrincipal(this.uri);
  },
  get extraPrincipals() {
    let extraPrincipals = [];
    [
      "http://newtab.firefoxchina.cn/"
    ].forEach(function(aSpec) {
      extraPrincipals.push(Services.scriptSecurityManager.
        getNoAppCodebasePrincipal(Services.io.newURI(aSpec, null, null)));
    });
    delete this.extraPrincipals;
    return this.extraPrincipals = extraPrincipals;
  },

  get localStorage() {
    this.storageManager.precacheStorage(this.principal);
    let localStorage;
    try {
      localStorage = this.storageManager.getStorage(this.principal);
    } catch(e) {
      // extra window or null required since Fx 34 <https://bugzil.la/660237>
      if (e.result == Cr.NS_ERROR_XPC_NOT_ENOUGH_ARGS) {
        localStorage = this.storageManager.getStorage(null, this.principal);
      } else {
        throw e;
      }
    }
    delete this.localStorage;
    return this.localStorage = localStorage;
  },
  get storageManager() {
    delete this.storageManager;
    return this.storageManager = Cc["@mozilla.org/dom/localStorage-manager;1"].
      getService(Ci.nsIDOMStorageManager);
  },

  _dbVersionKey: "moa.ntab.indexeddb.version",
  get dbVersion() {
    let dbVersion = 3;
    try {
      dbVersion = Services.prefs.getIntPref(this._dbVersionKey);
    } catch(e) {}

    return dbVersion;
  },
  set dbVersion(aVer) {
    Services.prefs.setIntPref(this._dbVersionKey, aVer);
  },

  _backupAndRestoreLocalStorage: function() {
    let temp = new Map();
    let self = this;
    for (let i = 0, l = this.localStorage.length; i < l; i++) {
      let key = this.localStorage.key(i);
      temp.set(key, this.localStorage.getItem(key));
    }

    // use |_executeSoon| to make this run after nsIDOMStorageManager's observe
    this._executeSoon(function() {
      temp.forEach(function(aValue, aKey) {
        self.localStorage.setItem(aKey, aValue);
      });
    });
  },

  _executeSoon: function (callback) {
    if (!callback)
      return;
    Services.tm.mainThread.dispatch(callback, Ci.nsIThread.DISPATCH_NORMAL);
  },

  // only for null:cookie-changed:cleared for now
  _keepLocalStorageOnClearingCookie: function () {
    Services.obs.addObserver(this, "cookie-changed", false);
    // Services.obs.addObserver(this, "browser:purge-domain-data", false);
  },

  _addPermission: function (aPrincipal) {
    let principal = aPrincipal || this.principal;
    let self = this;
    [
      Ci.nsIPermissionManager.ALLOW_ACTION,
      Ci.nsIOfflineCacheUpdateService.ALLOW_NO_WARN
    ].forEach(function(aPerm) {
      Services.perms.addFromPrincipal(principal, "offline-app", aPerm);
    });
  },

  _addExtraPermission: function () {
    let self = this;
    this.extraPrincipals.forEach(function(aPrincipal) {
      self._addPermission(aPrincipal);
    });
  },

  _migrateQuickDialData: function () {
    let data = QuickDialData.read();
    let self = this;
    Object.keys(data).forEach(function(aIndex) {
      let dial = data[aIndex];
      let thumbnail = dial.thumbnail;

      delete dial.rev;
      delete dial.search;

      let qdStore = self._db.transaction("quickdials", "readwrite").
        objectStore("quickdials");
      qdStore.put(dial, aIndex);

      // datauri will not be stored as blob in indexedDB
      if (!dial.thumbnail) {
        let path = OS.Path.join(OS.Constants.Path.profileDir, "ntab",
          "cache", PageThumbsStorage.getLeafNameForURL(dial.url));

        OS.File.read(path).then(function(aData) {
          let blob = new Blob([aData], {
            type: PageThumbs.contentType
          });
          let imgStore = self._db.transaction("images", "readwrite").
            objectStore("images");
          imgStore.put(blob, dial.url);
        }).then(null, Cu.reportError);
      }
    });
  },

  _boolPrefs: [
    "moa.ntab.backgroundnoise",
    "moa.ntab.dial.hideSearch",
    "moa.ntab.dial.useopacity",
    "moa.ntab.displayfooter",
    "moa.ntab.openLinkInNewTab",
    "moa.ntab.promo.disabled",
    "moa.ntab.qdtab.used"
  ],
  _charPrefs: [
    "moa.ntab.backgroundcolor",
    "moa.ntab.backgroundimagestyle",
    "moa.ntab.qdtab",
    "moa.ntab.view",
    "moa.ntab.view.firefoxchina.url"
  ],
  _intPrefs: [
    "moa.ntab.dial.column",
    "moa.ntab.dial.row",
    "moa.ntab.dial.rowlimit"
  ],

  _migratePrefToLocalStorage: function () {
    if (!this.localStorage) {
      try {
        this.localStorage = this.storageManager.
          createStorage(this.principal, this.spec);
      } catch(e) {
        // extra window or null required since Fx 34 <https://bugzil.la/660237>
        if (e.result == Cr.NS_ERROR_XPC_NOT_ENOUGH_ARGS) {
          this.localStorage = this.storageManager.
            createStorage(null, this.principal, this.spec);
        } else {
          throw e;
        }
      }
    }

    let self = this;
    let prefs = Services.prefs;
    this._boolPrefs.forEach(function(aKey) {
      try {
        if (prefs.prefHasUserValue(aKey)) {
          let value = prefs.getBoolPref(aKey);
          self.localStorage.setItem(aKey, value.toString());
        }
      } catch(e) {};
    });
    this._charPrefs.forEach(function(aKey) {
      try {
        if (prefs.prefHasUserValue(aKey)) {
          let value = prefs.getCharPref(aKey);
          self.localStorage.setItem(aKey, value);
        }
      } catch(e) {};
    });
    this._intPrefs.forEach(function(aKey) {
      try {
        if (prefs.prefHasUserValue(aKey)) {
          let value = prefs.getIntPref(aKey);
          self.localStorage.setItem(aKey, value.toString());
        }
      } catch(e) {};
    });

    let backgroundImage = "";
    try {
      backgroundImage = prefs.getCharPref("moa.ntab.backgroundimage");
    } catch(e) {};

    if (!backgroundImage) {
      return;
    }

    backgroundImage = Services.io.newURI(backgroundImage, null, null).
      QueryInterface(Ci.nsIFileURL);

    let file = backgroundImage.file;
    let ext = backgroundImage.fileExtension;
    let mimeService = Cc["@mozilla.org/mime;1"].
      getService(Ci.nsIMIMEService);
    let mimeType = "image/png";
    try {
      mimeType = mimeService.getTypeFromFile(file);
    } catch(e) {
      if (ext) {
        mimeType = mimeService.getTypeFromExtension(ext);
      }
    };

    OS.File.read(file.path).then(function(aData) {
      let blob = new Blob([aData], {type: mimeType});
      let store = self._db.transaction("images", "readwrite").
        objectStore("images");
      store.put(blob, "background");
    }).then(null, Cu.reportError);
  },

  _prePopulateSite: function () {
    let path = "resource://ntab/offlintab-cache/data/sites.json";
    path = Services.io.newURI(path, null, null).
      QueryInterface(Ci.nsIFileURL).file.path;

    let self = this;
    OS.File.read(path).then(function(aData) {
      let decoder = new TextDecoder();
      try {
        let data = JSON.parse(decoder.decode(aData));
        Object.keys(data).forEach(function(aCat) {
          let store = self._db.transaction(aCat, "readwrite").objectStore(aCat);
          Object.keys(data[aCat]).forEach(function(aIndex) {
            store.put(data[aCat][aIndex], aIndex);
          });
        });
      } catch(e) {}
    }).then(null, Cu.reportError);
  },

  _preloadOnce: function () {
    /* from resource:///modules/BrowserNewTabPreloader.jsm */
    let doc = Services.appShell.hiddenDOMWindow.document;
    if (doc.readyState !== "complete") {
      return;
    }

    let htmlNS = "http://www.w3.org/1999/xhtml";
    let xulNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    let xulPage = "data:application/vnd.mozilla.xul+xml;charset=utf-8," +
                  "<window%20id='win'/>";
    let frame = doc.createElementNS(htmlNS, "iframe");
    let self = this;
    frame.addEventListener("load", function(aEvt) {
      let frame = aEvt.currentTarget.contentWindow;
      if (frame.location.href == xulPage) {
        let doc = frame.document;
        let browser = doc.createElementNS(xulNS, "browser");
        browser.setAttribute("type", "content");
        browser.setAttribute("disableglobalhistory", "true");
        browser.setAttribute("src", self.prePath + "/static/preload.html");
        doc.getElementById("win").appendChild(browser);
      } else {
        frame.location = xulPage;
      }
    }, true);
    doc.documentElement.appendChild(frame);
  },

  _purgeObsoletedData: function () {
    /*
     * files, prefs
     * async purge after successfully migrated
     */
  },

  _migrateData: function () {
    this._addPermission();
    this._migrateQuickDialData();
    this._migratePrefToLocalStorage();
    this._prePopulateSite();
    this._preloadOnce();
  },

  _initSchema: function (aEvt) {
    if (aEvt.oldVersion) {
      return;
    }

    let self = this;
    let request = aEvt.target;
    this._db = request.result;

    let qdStore = this._db.createObjectStore("quickdials");
    let defaultPositionIndex = qdStore.createIndex("defaultposition",
      "defaultposition", {unique: true});

    [
      "images",
      "famoussites",
      "newssites",
      "shoppingsites",
      "entertainsites",
      "sitesimages",
      "frequentsites"
    ].forEach(function(aStoreName) {
      self._db.createObjectStore(aStoreName);
    });
    // until the version when this goes public, no addition after that

    request.transaction.oncomplete = this._migrateData.bind(this);
  },

  get storageDir() {
    delete this.storageDir;
    return this.storageDir = OS.Path.join(OS.Constants.Path.profileDir,
      "storage", "persistent", "http+++offlintab.firefoxchina.cn", "idb");
  },
  get storageSqlite() {
    delete this.storageSqlite;
    return this.storageSqlite = OS.Path.join(this.storageDir,
      "123733528obfaftlni.sqlite");
  },
  get storageFiles() {
    delete this.storageFiles;
    return this.storageFiles = OS.Path.join(this.storageDir,
      "123733528obfaftlni");
  },
  _fixMissingSqlite: function(aAction) {
    let self = this;
    OS.File.exists(this.storageSqlite).then(function(aExisted) {
      if (aExisted) {
        return;
      }

      OS.File.stat(self.storageFiles).then(function(aInfo) {
        if (!aInfo.isDir) {
          return;
        }

        if (OS.File.removeDir) {
          OS.File.removeDir(self.storageFiles);
        } else {
          (new FileUtils.File(self.storageFiles)).remove(true);
        }

        Tracking.track({
          type: "unknown",
          action: aAction,
          sid: "missing-sqlite"
        });
      });
    })
  },
  fixUnknownError: function(aAction) {
    this._fixMissingSqlite(aAction);

    Tracking.track({
      type: "unknown",
      action: aAction,
      sid: "attempt",
    });
  },

  _extraSuccessCb: null,
  _onSuccess: function (aEvt) {
    let self = this;
    this._db = aEvt.target.result;
    this._db.onversionchange = function() {
      self._db.close();
      self._db = null;
    };
    if (this._extraSuccessCb) {
      this._extraSuccessCb();
    }
  },
  _onError: function (aEvt) {
    switch (aEvt.target.error.name) {
      case "VersionError":
        this.dbVersion = this.dbVersion + 1;
        this._openDB();
        break;
      case "UnknownError":
        this.fixUnknownError("NTabDB");
        break;
    }
  },

  _openDB: function () {
    let version = this.dbVersion;
    let request = indexedDB.
      openForPrincipal(this.principal, "offlintab", version);
    request.onupgradeneeded = this._initSchema.bind(this);
    request.onsuccess = this._onSuccess.bind(this);
    request.onerror = this._onError.bind(this);
  },

  _ensureDB: function (aCallback) {
    if (this._db) {
      aCallback();
    } else {
      let self = this;
      this._extraSuccessCb = function () {
        self._extraSuccessCb = null;
        aCallback();
      };
      this._openDB();
    }
  },

  migrateNTabData: function () {
    this._openDB();
    this._addExtraPermission();
    this._keepLocalStorageOnClearingCookie();
  },

  getAltSpec: function() {
    let altSpec = getPref(this.altSpecPref, "", Ci.nsIPrefLocalizedString);
    try {
      let altUri = Services.io.newURI(altSpec, null, null);
      return altUri.prePath === this.prePath ? "" : altSpec;
    } catch(e) {
      return "";
    }
  },

  getPref: function (aKey, aDefault) {
    try {
      let item = this.localStorage.getItem(aKey);
      if (typeof(item) === "string") {
        try {
          return JSON.parse(item);
        } catch(e) {}
      }
      return item || aDefault;
    } catch(e) {
      return aDefault;
    }
  },

  getDial: function (aIndex, aOnSuccess) {
    if (typeof(aIndex) == "number") {
      aIndex = aIndex.toString();
    }

    let self = this;
    this._ensureDB(function () {
      self._db.transaction("quickdials").objectStore("quickdials").
        get(aIndex).onsuccess = aOnSuccess;
    });
  },

  fillBlankDial: function (aDial, aOnEnd) {
    let self = this;
    this._ensureDB(function () {
      let col = self.getPref("moa.ntab.dial.column", 4);
      let row = self.getPref("moa.ntab.dial.row", 2);
      col = Math.max(2, Math.min(col, 6));
      row = Math.max(1, Math.min(row, 20));
      let count = col * row;

      let index = 0;
      let onSuccess = function(aEvt) {
        let result = aEvt.target && aEvt.target.result;
        let index = parseInt(result, 10);

        self.localStorage.setItem("moa.ntab.dial.update." + result, Date.now());

        aOnEnd(index);
      };
      let maybeFillDial = function() {
        index += 1;
        if (index <= count) {
          let store = self._db.transaction("quickdials", "readwrite").
            objectStore("quickdials");
          let request = store.add(aDial, index.toString());
          request.onsuccess = onSuccess;
          request.onerror = maybeFillDial;
        } else {
          aOnEnd(-1);
        }
      };
      maybeFillDial();
    });
  },

  /**
   * nsIDOMStorageManager will asynchronously clear the data on receiving
   * these notifications, so we have the chance to back them up here.
   */
  observe: function (aSubject, aTopic, aData) {
    switch (aTopic) {
      case "cookie-changed":
        if (aData !== "cleared") {
          break;
        }

        this._backupAndRestoreLocalStorage();
        break;
      case "browser:purge-domain-data":
        if (aData !== this.uri.host) {
          break;
        }

        this._backupAndRestoreLocalStorage();
        break;
    }
  }
};
