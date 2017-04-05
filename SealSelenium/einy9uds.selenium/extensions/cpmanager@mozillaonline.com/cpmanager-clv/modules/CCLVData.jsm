let EXPORTED_SYMBOLS = ["CCLVData"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "NetUtil",
  "resource://gre/modules/NetUtil.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "OS",
  "resource://gre/modules/osfile.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "FileUtils",
  "resource://gre/modules/FileUtils.jsm");
XPCOMUtils.defineLazyGetter(this, "gUnicodeConverter", function() {
  let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
    createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = "utf8";
  return converter;
});

let LOG = function(m) Services.console.logStringMessage(m);

let CCLVData = {
  get verifier() {
    delete this.verifier;
    return this.verifier = Cc["@mozilla.org/security/datasignatureverifier;1"].
      getService(Ci.nsIDataSignatureVerifier);
  },

  get key() {
    let key = "";
    try {
      let prefKey = "extensions.cpmanager@mozillaonline.com.server-updates.key";
      key = Services.prefs.getCharPref(prefKey);
    } catch(e) {}
    delete this.key;
    return this.key = key;
  },

  updateUrl: "http://cclv.firefoxchina.cn/cclv/v2/patterns.json",

  get _bundleData() {
    let uri = Services.io.newURI("resource://cpmanager-clv/cclvpatterns.json",
      null, null);
    delete this._bundleData;
    return this._bundleData = uri.QueryInterface(Ci.nsIFileURL).file;
  },

  get _latestData() {
    delete this._latestData;
    return this._latestData = FileUtils.
      getFile("ProfLD", ["cclv", "patterns.json"], false);
  },

  _fetch: function(aUrl, aCallback) {
    if (!aUrl) {
      return;
    }
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
    xhr.open("GET", aUrl, true);
    xhr.onload = function(evt) {
      if (xhr.status == 200) {
        let data = JSON.parse(xhr.responseText);
        aCallback(data);
      }
    };
    xhr.onerror = function(evt) {};
    xhr.send();
  },

  _validate: function(aData) {
    try {
      let data = aData.data;
      let signature = aData.signature;
      return this.verifier.verifyData(data, signature, this.key);
    } catch(e) {
      LOG(e);
      return false;
    }
  },

  _loadData: function(aFile) {
    let text = null;
    if (aFile.exists() && aFile.fileSize) {
      let fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                      createInstance(Ci.nsIFileInputStream);
      fstream.init(aFile, -1, 0, 0);
      text = NetUtil.readInputStreamToString(fstream, fstream.available());
      text = gUnicodeConverter.ConvertToUnicode(text);
    }
    return text && JSON.parse(text);
  },

  _dumpData: function(aFile, aData) {
    aData = JSON.stringify(aData);

    OS.File.open(aFile.path, {
      truncate: true
    }).then(function(aFile) {
      let encoder = new TextEncoder();
      let data = encoder.encode(aData);
      aFile.write(data).then(function() {
        aFile.close();
      });
    });
  },

  _timer: null,

  init: function() {
    try {
      let self = this;
      this._timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      this._timer.initWithCallback(function() {
        self.update();
      }, 60000, Ci.nsITimer.TYPE_ONE_SHOT);
    } catch(e) {}
  },

  read: function() {
    let data = null;
    try {
      data = this._loadData(this._latestData);
    } catch(e) {}

    return data || this._loadData(this._bundleData);
  },

  update: function() {
    let self = this;
    this._fetch(this.updateUrl, function(aData) {
      if (self._validate(aData)) {
        self._dumpData(self._latestData, JSON.parse(aData.data));
      }
    });
  }
};

CCLVData.init();
