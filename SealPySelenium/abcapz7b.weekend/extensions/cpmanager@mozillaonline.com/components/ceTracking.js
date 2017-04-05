
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const _CID = Components.ID('{C40350A8-F734-4CFF-99D9-95274D408143}');
const _CONTRACTID = "@mozilla.com.cn/tracking;1";
const USAGE_URI = 'http://addons.g-fox.cn/tk.gif';

const ACTIVE_TIME_PREF = "extensions.cpmanager@mozillaonline.com.active_time";
const PK_PREF = "extensions.cpmanager@mozillaonline.com.uuid";
const LOCALE_PREF = "general.useragent.locale";
const CHANNEL_PREF = "app.chinaedition.channel"
const DISTRIBUTION_PREF = "distribution.version"

const ONEDAY = 24 * 60 * 60 * 1000;
const ADU_INTERVAL = 24 * 60 * 60 * 1000;

XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "FxaSwitcher",
  "chrome://cmimprove/content/fxa/serviceSwitcher.jsm");

function LOG(txt) {
  var consoleService = Cc["@mozilla.org/consoleservice;1"]
                       .getService(Ci.nsIConsoleService);
                       consoleService.logStringMessage("tracking: " + txt);
}

function hasPref(name) {
  try {
    Services.prefs.getCharPref(name);
    return true;
  } catch (e) {
    return false;
  }
}

function getPrefStr(name, defValue) {
  try {
    return Services.prefs.getCharPref(name);
  } catch (e) {
    return defValue;
  }
}

function setPrefStr(name, value) {
  try {
    Services.prefs.setCharPref(name, value);
  } catch (e) {
    Components.utils.reportError(e);
  }
}

function getPrefInt(name, defValue) {
  try {
    return Services.prefs.getIntPref(name);
  } catch (e) {
    return defValue;
  }
}

function setPrefInt(name, value) {
  try {
    Services.prefs.setIntPref(name, value);
  } catch (e) {
    Components.utils.reportError(e);
  }
}

function getPrefBool(name, defValue) {
  try {
    return Services.prefs.getBoolPref(name);
  } catch (e) {
    return defValue;
  }
}

function usageDataEnabled() {
  try {
    return !Services.prefs.getBoolPref("extensions.cpmanager.tracking.notification.show") &&
            Services.prefs.getBoolPref("extensions.cpmanager.tracking.enabled");
  } catch (e) {
    return false;
  }
}

function generateUUID() {
  return Cc["@mozilla.org/uuid-generator;1"]
          .getService(Ci.nsIUUIDGenerator)
          .generateUUID()
          .number;
}
function isUUID(str) {
  return str.length == 38;
}

//user key
function getUK() {
  function getUKFile() {
    let file = null;
    try {
      file = Services.dirsvc.get("DefProfRt", Ci.nsIFile)
      file.append("profiles.log");
    } catch (e) {
      return null;
    }
    return file;
  }
  function readUK() {
    let uuid = "";
    try {
      let file = getUKFile();
      if (!file || !file.exists()) {
        throw "Could not read file ";
      }
      let fstream = Cc["@mozilla.org/network/file-input-stream;1"].
          createInstance(Ci.nsIFileInputStream);
      fstream.init(file, -1, 0, 0);

      let cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
          createInstance(Ci.nsIConverterInputStream);
      cstream.init(fstream, "UTF-8", 0, 0);
      let str = "", data = {};
      // read the whole file
      while (cstream.readString(-1, data)) {
        str += data.value;
      }
      cstream.close(); // this also closes fstream
      let obj = JSON.parse(str)
      if (!isUUID(obj.uuid)) {
        throw "invalid uuid [" + obj.uuid + "]";
      }
      uuid = obj.uuid;
    }
    catch (e) {
      return "";
    }
    return uuid;
  }
  function writeUK(uuid) {
    try {
      let file = getUKFile();
      if (!file) {
        return false;
      }
    let str = JSON.stringify({uuid:uuid});
    let foStream = Cc["@mozilla.org/network/file-output-stream;1"].
        createInstance(Ci.nsIFileOutputStream);
    // flags are write, create, truncate
    foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

    let converter = Cc["@mozilla.org/intl/converter-output-stream;1"].
        createInstance(Ci.nsIConverterOutputStream);
    converter.init(foStream, "UTF-8", 0, 0);
    converter.writeString(str);
    converter.close(); // this also closes foStream
    } catch (e) {
      return false;
    }
    return true;
  }
  var uuid = readUK();
  if (!uuid) {
    uuid = generateUUID();
    if (!writeUK(uuid)) {
      return "-" + getPK(); //"-" : user key error
    }
  }
  return encodeURIComponent(uuid);
}

//profile key
function getPK() {
  let uuid = "";
  try {
    uuid = Services.prefs.getCharPref(PK_PREF);
    if (!isUUID(uuid)) {
      throw "invalid uuid [" + uuid + "]";
    }
  } catch (e) {
    uuid = generateUUID();
    Services.prefs.setCharPref(PK_PREF, uuid);
  }
  return encodeURIComponent(uuid);
}

function cpmanager_paramCEHome() {
  var usingCEHome = 'badpref';
  try {
    var homePref = Services.prefs.getComplexValue("browser.startup.homepage", Ci.nsIPrefLocalizedString).data;
    usingCEHome = [/^about:cehome$/, /^http:\/\/[a-z]+\.firefoxchina\.cn/, /^http:\/\/[iz]\.g-fox\.cn/].some(function(regex) {
      return homePref.split('|').some(function(home) {
        return regex.test(home);
      });
    }).toString();
  } catch(e) {}
  return usingCEHome;
}

var prefileAge = -1;
function getAge() {
  function onSuccess(times) {
    if (times && times.created) {
      var days = (new Date() - times.created) / ONEDAY;
      prefileAge = parseInt(days);
    }
  }
  try {
    Components.utils.import("resource://services-common/utils.js");
    var file = Services.dirsvc.get("ProfD", Ci.nsIFile);
    file.append("times.json");
    CommonUtils.readJSON(file.path).then(onSuccess);
  } catch (e) {
  }
};

function getPluginVersion(name) {
  var tags = Cc["@mozilla.org/plugin/host;1"]
             .getService(Ci.nsIPluginHost)
             .getPluginTags({});
  for (var tag of tags) {
    if (tag.name == name) {
      return tag["version"];
    }
  }
  return "";
}

function isDefaultBrowser(aForAllTypes) {
  try {
    return Cc["@mozilla.org/browser/shell-service;1"]
             .getService(Components.interfaces.nsIShellService)
             .isDefaultBrowser(false, aForAllTypes);
  } catch (e) {
    return null;
  }
}

function getActive() {
  try {
    var act = parseInt(Services.prefs.getCharPref(ACTIVE_TIME_PREF));
  } catch (e) {
    return "&activate=true";
  }
  return "";
}

var MOExtensions = "";
function getMOExts() {
  try {
    if (!MOExtensions) {
      var extstr = "";
      try {
        extstr = Services.prefs.getCharPref("extensions.enabledItems");
      } catch(e) {}
      try {
        extstr = Services.prefs.getCharPref("extensions.enabledAddons");
      } catch (e) {}
      var extensions = extstr.split(",");
      extensions = extensions.map(function(ext) ext.replace('%40', '@'));

      var bootstrapped = {};
      try {
        var bsstr = Services.prefs.getCharPref("extensions.bootstrappedAddons");
        bootstrapped = JSON.parse(bsstr);
      } catch(e) {
        bootstrapped = {};
      }
      for (var id in bootstrapped) {
        extensions.push(id + ":" + bootstrapped[id]["version"]);
      }
      MOExtensions = extensions.filter(function(ext) /(@mozillaonline\.com|@mozilla\.com\.cn|muter@yxl\.name|personas@christopher\.beard)/.test(ext));
      MOExtensions = MOExtensions.map(function(ext) {return ext.substring(0, ext.indexOf("@")) + ext.substring(ext.indexOf(":"))});
      MOExtensions = MOExtensions.join(",");
    }
    return MOExtensions ? "&moexts=" + MOExtensions : "";
  } catch(e) {
    return "";
  }
}

function getADUData() {
  let channelid = getPrefStr(CHANNEL_PREF,"www.firefox.com.cn");
  let pk = getPK();
  let uk = getUK();
  let ver = getPrefStr("extensions.lastAppVersion","");
  let cev = getPrefStr(DISTRIBUTION_PREF,"");

  let adudata = ADU_URL + "?ver=2_2"
              + "&now=" + Date.now()
              + "&channelid=" + channelid
              + "&fxversion=" + ver                       //cpmanager_paramCEVersion
              + "&ceversion=" + cev                       //cpmanager_paramCEVersion
//            + getActive();                              //cpmanager_paramActive() remove for test version
              + "&locale=" + getPrefStr(LOCALE_PREF, "")  //cpmanager_paramLocale()
              + "&age=" + prefileAge
              + "&pk=" + pk + "&uk=" + uk                 //uuid
  if (usageDataEnabled()) {
    adudata = adudata
            + "&ude=true"
            + "&default=" + isDefaultBrowser(true)
            + "&defaultHttp=" + isDefaultBrowser(false)
            + "&cehome=" + cpmanager_paramCEHome()
            + "&flash=" + getPluginVersion("Shockwave Flash")  //get flash version
            + getMOExts()
            + "&fxa=" + FxaSwitcher.localServiceEnabled  // Indicates if switched Fxa services' entries.
  }

  return adudata;
}

function httpGet (url) {
  try {
    let xmlHttpRequest = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
    xmlHttpRequest.QueryInterface(Ci.nsIJSXMLHttpRequest);
    xmlHttpRequest.open('GET', url, true);
    xmlHttpRequest.send(null);
    xmlHttpRequest.onload = function() {
      LOG('httpGet:load');
    };
    xmlHttpRequest.onerror = function() {
      LOG('httpGet:error');
    };
  } catch(e) {
    LOG(e);
  }
};

const RETRY_DELAY = 20 * 1000;
const ADU_URL = 'http://adu.g-fox.cn/adu-new.gif';
const ADU_LAST = "extensions.cpmanager@mozillaonline.com.adu.last";
const ADUTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

function untilTomorrow(now) {
  var t = new Date(now);
  t.setDate(t.getDate() + 1);
  t.setHours(0);
  t.setMinutes(parseInt(Math.random() * 10));// random 0 to 9
  return t - now;
}
function sendNextADU() {
  let last = getPrefStr(ADU_LAST, ""); // "" : first time
  let now = new Date();
  let today = now.toDateString();
  let delay = 5000; //delay 5s on first time or error
  if (last == today) {
    delay = untilTomorrow(now);
  }
  sendADU(null, delay);
}

function sendADU(url, delay) {
  ADUTimer.initWithCallback({
    notify: function() {
      try {
        url = url || getADUData();
        let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                    .createInstance(Ci.nsIXMLHttpRequest);
        xhr.QueryInterface(Ci.nsIJSXMLHttpRequest);
        xhr.open('GET', url, true);
        xhr.onload = function() {
          if (xhr.status != 200) { //net error
            sendADU(url, RETRY_DELAY)
          } else {
            let today = new Date().toDateString();
            setPrefStr(ADU_LAST, today);
            var check = getPrefStr(ADU_LAST, "");
            // Make sure pref is successfully set
            // before preparing to send next ADB tomorrow.
            // If failed to set the pref, do nothing.
            if (today == check) {
              sendNextADU();
            }
          }
        };
        xhr.onerror = function() {
          sendADU(url, RETRY_DELAY)
        };
        xhr.send(null);
      } catch (e) {
        sendADU(null, RETRY_DELAY)
      }
    }
  }, delay, Ci.nsITimer.TYPE_ONE_SHOT);
}

function sendUsageData(data) {
  let str = '';
  for (let i in data) {
    str += '&' + i + '=' + data[i];
  }
  try {
    var providers = JSON.parse(getPrefStr("social.activeProviders", "{}"));
    if (Object.keys(providers).length) {
      str += "&sociallogin=" + getPrefBool("social.haslogin", "null");
      str += "&socialsidebar=" + (getPrefBool("social.enabled", false) && getPrefBool("social.sidebar.open", false));
    }
  } catch (e) {};

  try {
    /**
     * detect if Fx was set/locked as default with 3rd party software.
     * check against sdb-openhelp-*, not the {after,before} suffix.
     */
    let match = /\&sdb-attempt-([\d.]+)-[ab]=/.exec(str);
    if (match) {
      str += ("&sdb-quit-" + match[1] + "=" + isDefaultBrowser(true));
    }
  } catch(e) {};

  if (str == '') {
    return;
  }
  let tracking_random = Math.random();
  str = USAGE_URI + '?when=quit&r=' + tracking_random + str;
  httpGet(str);
}
function trackingFactoryClass() {
  this.wrappedJSObject = this;
}

trackingFactoryClass.prototype = {
  classDescription: "Tracking for Imporve Firefox",
  contractID: _CONTRACTID,
  classID: _CID,
  _xpcom_categories: [{ category: "profile-after-change" }],
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  //tracking key:count
  data: {},

  trackPrefs: function(key, value) {
    this.data[key] = value;
  },

  track: function(key) {
    if (typeof this.data[key] == 'number') {
      this.data[key] ++;
    } else {
      this.data[key] = 1;
    }
  },

  get ude() {
    return usageDataEnabled();
  },

  send: function(url) {
    if (this.ude) {
      httpGet(url);
    }
    return this.ude;
  },

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "profile-after-change":
        getAge();
        Services.obs.addObserver(this, "quit-application", true);
        Services.obs.addObserver(this, "final-ui-startup", true);
        if (this.ude) {
          let tracking_random = Math.random();
          let str = USAGE_URI + '?when=run&r=' + tracking_random;
          httpGet(str);
        }
        break;
      case "final-ui-startup":
        sendNextADU();
        break;
      case "quit-application":
        if (this.ude) {
          sendUsageData(this.data);
        }
        break;
    };
  },

}

const NSGetFactory = XPCOMUtils.generateNSGetFactory([trackingFactoryClass]);
