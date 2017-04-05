
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const _CID = Components.ID('{6E12E09F-1942-46F0-8D85-9C6B1D0E6448}');
const _CONTRACTID = "@mozilla.com.cn/tracking-old;1";

const ACTIVE_TIME_PREF = "extensions.cpmanager@mozillaonline.com.active_time";
const PK_PREF = "extensions.cpmanager@mozillaonline.com.uuid";
const LOCALE_PREF = "general.useragent.locale";
const CHANNEL_PREF = "app.chinaedition.channel"
const DISTRIBUTION_PREF = "distribution.version"

Cu.import("resource://gre/modules/Services.jsm");


function LOG(txt) {
  var consoleService = Cc["@mozilla.org/consoleservice;1"]
                       .getService(Ci.nsIConsoleService);
                       consoleService.logStringMessage("tracking" + txt);
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
  return "&cehome=" + usingCEHome;
}

const ONEDAY = 24*60*60*1000;

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
    var now = (new Date()).getTime();
    Services.prefs.setCharPref(ACTIVE_TIME_PREF, now);//activate,pref no find
    return "&activate=true";
  }
	return "";
}
var activeStr = getActive();

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
        extensions.push(id);
      }
      MOExtensions = extensions.filter(function(ext) /(@mozillaonline\.com|@mozilla\.com\.cn|muter@yxl\.name|personas@christopher\.beard)/.test(ext));
      MOExtensions = MOExtensions.map(function(ext) ext.substring(0, ext.indexOf("@")));
      MOExtensions = MOExtensions.join(",");
    }
    return MOExtensions ? "&moexts=" + MOExtensions : "";
  } catch(e) {
    return "";
  }
}

function getADUData() {
  let channelidstr = "?channelid=";
  let channelid = getPrefStr(CHANNEL_PREF,"www.firefox.com.cn");
  channelidstr += channelid;

  let pk = getPK();
  let uk = getUK();
  let ver = getPrefStr("extensions.lastAppVersion","");
  let cev = getPrefStr(DISTRIBUTION_PREF,"");
	return channelidstr
    // + cpmanager_paramFUOD(fuodPref)
       + "&fxversion=" + ver                       //cpmanager_paramCEVersion
       + "&ceversion=" + cev                       //cpmanager_paramCEVersion
       + "&ver=2_2&pk=" + pk + "&uk=" + uk         //cpmanager_paramActCode()
    // + cpmanager_paramSyncStatus()
       + cpmanager_paramCEHome()
    // + cpmanager_paramPrevSessionLen()
       + activeStr                                 //cpmanager_paramActive()
       + "&locale=" + getPrefStr(LOCALE_PREF, "")  //cpmanager_paramLocale()
       + getMOExts()    //cpmanager_paramMOExts()
       + "&age=" + prefileAge
       + "&default=" + isDefaultBrowser(true)
       + "&defaultHttp=" + isDefaultBrowser(false)
       + "&flash=" + getPluginVersion("Shockwave Flash")  //get flash version
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
const RETRY_DELAY = 20*1000;
const ADU_Task = [
  {
    task: "5s",
    delay: 5*1000,
    url: 'http://adu.g-fox.cn/adu.gif',
  },
  {
    task: "5m",
    delay: 5*60*1000,
    url: 'http://adu.g-fox.cn/adu-1.gif',
  },
];
var ADUIndex = 0;
const ADUTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

function sendADU(index) {
  if (index >= ADU_Task.length) {
    return;
  }
  _ADU(ADU_Task[index].delay);
}

function _ADU(delay) {
  ADUTimer.initWithCallback({
    notify: function() {
      let str =  ADU_Task[ADUIndex].url + getADUData() + '&now=' + (new Date()).getTime();
      let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                  .createInstance(Ci.nsIXMLHttpRequest);
      xhr.QueryInterface(Ci.nsIJSXMLHttpRequest);
      xhr.open('GET', str, true);
      xhr.addEventListener("error", function(event) { _ADU(RETRY_DELAY);}, false);
      xhr.addEventListener("load", function(event) { sendADU(++ADUIndex);}, false);
      xhr.send(null);
    }
  }, delay, Ci.nsITimer.TYPE_ONE_SHOT);
}

function trackingFactoryClassOld() {
  this.wrappedJSObject = this;
}

trackingFactoryClassOld.prototype = {
  classDescription: "Tracking for Imporve Firefox",
  contractID: _CONTRACTID,
  classID: _CID,
  _xpcom_categories: [{ category: "profile-after-change" }],
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "profile-after-change":
        getAge();
        Services.obs.addObserver(this, "quit-application", true);
        Services.obs.addObserver(this, "final-ui-startup", true);
        break;

      case "final-ui-startup":
        sendADU(0);
        break;
    };
  },

}

const NSGetFactory = XPCOMUtils.generateNSGetFactory([trackingFactoryClassOld]);
