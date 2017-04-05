/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is IETab. Modified In Coral IE Tab.
 *
 * The Initial Developer of the Original Code is yuoo2k <yuoo2k@gmail.com>.
 * Modified by quaful <quaful@msn.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006-2008
 * the Initial Developer. All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components; 
 
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://coba/cobaUtils.jsm");

 /**
 * @namespace
 */
var COBA = COBA || {};

COBA.containerUrl = "chrome://coba/content/container.xhtml?url=";
COBA.navigateParamsAttr = "cobaNavigateParams";
COBA.objectID = "coba-object";

COBA.isValidURL = function (url) {
  var b = false;
  try {
    var uri = Services.io.newURI(url, null, null);
    b = true;
  } catch (e) {cobaUtils.ERROR(e)}
  return b;
}

COBA.isValidDomainName = function (domainName) {
  return /^[0-9a-zA-Z]+[0-9a-zA-Z\.\_\-]*\.[0-9a-zA-Z\_\-]+$/.test(domainName);
}

/** 从Plugin URL中提取实际访问的URL */
COBA.getActualUrl = function(url) {
	if (url && url.length > 0) {
		url = url.replace(/^\s+/g, "").replace(/\s+$/g, "");
		if (/^file:\/\/.*/.test(url)) url = url.replace(/\|/g, ":");
		if (url.substr(0, COBA.containerUrl.length) == COBA.containerUrl) {
			url = decodeURI(url.substring(COBA.containerUrl.length));

			if (!/^[\w]+:/.test(url)) {
				url = "http://" + url;
			}
		}
	}
	return url;
}

COBA.getChromeWindow = function () {
  return Services.wm.getMostRecentWindow("navigator:browser");
}

/**
 * 由于IE不支持Text Zoom, 只考虑Full Zoom
 */
COBA.getZoomLevel = function () {
  var aBrowser = (typeof (gBrowser) == "undefined") ? COBA.getChromeWindow().gBrowser : gBrowser;
  var docViewer = aBrowser.selectedBrowser.markupDocumentViewer;
  var zoomLevel = docViewer.fullZoom;
  return zoomLevel;
}

/**
 * 由于IE不支持Text Zoom, 只考虑Full Zoom
 */
COBA.setZoomLevel = function (value) {
  var aBrowser = (typeof (gBrowser) == "undefined") ? COBA.getChromeWindow().gBrowser : gBrowser;
  var docViewer = aBrowser.selectedBrowser.markupDocumentViewer;
  docViewer.fullZoom = value;
}



//-----------------------------------------------------------------------------
COBA.addEventListener = function (obj, type, listener) {
  if (typeof (obj) == "string") obj = document.getElementById(obj);
  if (obj) obj.addEventListener(type, listener, false);
}
COBA.removeEventListener = function (obj, type, listener) {
  if (typeof (obj) == "string") obj = document.getElementById(obj);
  if (obj) obj.removeEventListener(type, listener, false);
}

COBA.addEventListenerByTagName = function (tag, type, listener) {
  var objs = document.getElementsByTagName(tag);
  for (var i = 0; i < objs.length; i++) {
    objs[i].addEventListener(type, listener, false);
  }
}
COBA.removeEventListenerByTagName = function (tag, type, listener) {
  var objs = document.getElementsByTagName(tag);
  for (var i = 0; i < objs.length; i++) {
    objs[i].removeEventListener(type, listener, false);
  }
}

/** 将attribute值V替换为myFunc+V*/
COBA.hookAttr = function (parentNode, attrName, myFunc) {
  if (typeof (parentNode) == "string") parentNode = document.getElementById(parentNode);
  try {
    parentNode.setAttribute(attrName, myFunc + parentNode.getAttribute(attrName));
  } catch (e) {
    cobaUtils.ERROR("Failed to hook attribute: " + attrName);
  }
}

COBA.startsWith = function (s, prefix) {
  if (s) return ((s.substring(0, prefix.length) == prefix));
  else return false;
}

COBA.endsWith = function (s, suffix) {
  if (s && (s.length > suffix.length)) {
    return (s.substring(s.length - suffix.length) == suffix);
  } else return false;
}

//-----------------------------------------------------------------------------
COBA.getDefaultCharset = function (defval) {
  var charset = this.getCharPref("extensions.coba.intl.charset.default", "");
  if (charset.length) return charset;
  if (Services.prefs.prefHasUserValue("intl.charset.default")) {
    return Services.prefs.getCharPref("intl.charset.default");
  } else {
    var strBundle = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
    var intlMess = strBundle.createBundle("chrome://global-platform/locale/intl.properties");
    try {
      return intlMess.GetStringFromName("intl.charset.default");
    } catch (e) {
      {cobaUtils.WARN(e)}
      return defval;
    }
  }
}

COBA.queryDirectoryService = function (aPropName) {
  try {
    var dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
    var file = dirService.get(aPropName, Ci.nsIFile);
    return file.path;
  } catch (e) {cobaUtils.ERROR(e)}

  return null;
}

COBA.convertToUTF8 = function (data, charset) {
  try {
    data = decodeURI(data);
  } catch (e) {
    cobaUtils.WARN("convertToUTF8 faild");
    if (!charset) charset = COBA.getDefaultCharset();
    if (charset) {
      var uc = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
      try {
        uc.charset = charset;
        data = uc.ConvertToUnicode(unescape(data));
        data = decodeURI(data);
      } catch (e) {cobaUtils.ERROR(e)}
      uc.Finish();
    }
  }
  return data;
}

COBA.convertToASCII = function (data, charset) {
  if (!charset) charset = COBA.getDefaultCharset();
  if (charset) {
    var uc = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    uc.charset = charset;
    try {
      data = uc.ConvertFromUnicode(data);
    } catch (e) {
      cobaUtils.WARN("ConvertFromUnicode faild");
      data = uc.ConvertToUnicode(unescape(data));
      data = decodeURI(data);
      data = uc.ConvertFromUnicode(data);
    }
    uc.Finish();
  }
  return data;
}

//-----------------------------------------------------------------------------
COBA.getUrlDomain = function (url) {
  var r = "";
  if (url && !COBA.startsWith(url, "about:")) {
    if (/^file:\/\/.*/.test(url)) r = url;
    else {
      try {
        var uri = Services.io.newURI(url, null, null);
        uri.path = "";
        r = uri.spec;
      } catch (e) {cobaUtils.ERROR(e)}
    }
  }
  return r;
}

COBA.getUrlHost = function (url) {
  if (url && !COBA.startsWith(url, "about:")) {
    if (/^file:\/\/.*/.test(url)) return url;
    var matches = url.match(/^([A-Za-z]+:\/+)*([^\:^\/]+):?(\d*)(\/.*)*/);
    if (matches) url = matches[2];
  }
  return url;
}
