/*
This file is part of Fire-IE.

Fire-IE is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Fire-IE is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Fire-IE.  If not, see <http://www.gnu.org/licenses/>.
*/

var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://coba/cobaUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

/**
 * @namespace
 */
if (typeof(COBA) == "undefined") {
  var COBA = {};
}

function getWindowForWebProgress(webProgress) {
  try {
    if (webProgress){
      return webProgress.DOMWindow;
    }
  } catch (err) {
  }
  return null;
}

function getWebProgressForRequest(request) {
  try {
    if (request && request.notificationCallbacks)
      return request.notificationCallbacks.getInterface(Ci.nsIWebProgress);
  } catch (err ) {
  }

  try {
    if (request && request.loadGroup && request.loadGroup.groupObserver)
      return request.loadGroup.groupObserver.QueryInterface(Ci.nsIWebProgress);
  } catch (err) {
  }

  return null;
};

function getWindowForRequest(request){
  return getWindowForWebProgress(getWebProgressForRequest(request));
}

COBA.HttpObserver = {
  // nsISupports
  QueryInterface: function(iid) {
    if (iid.equals(Ci.nsISupports) ||
      iid.equals(Ci.nsIObserver)) {
      return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  // nsIObserver
  observe: function(subject, topic, data) {
    if (!(subject instanceof Ci.nsIHttpChannel))
      return;
    switch (topic) {
      case 'http-on-modify-request':
        this.onModifyRequest(subject);
        break;
      }
  },

  onModifyRequest: function(subject) {
    var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    var win = getWindowForRequest(httpChannel);
    var tab = cobaUtils.getTabFromWindow(win);
    var isWindowURI = httpChannel.loadFlags & Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
    if (isWindowURI && tab) {
      var url = httpChannel.URI.spec;
      var skipDomain = tab.getAttribute("skipDomain");
      if (skipDomain && skipDomain == COBA.getUrlDomain(url).toLowerCase()) {
        return ;
      }
      if (this.shouldFilter(url)) {
        if (!tab.linkedBrowser) return;

        subject.cancel(Cr.NS_BINDING_SUCCEEDED);

        // http headers
        var headers = this._getAllRequestHeaders(httpChannel);

        // post data
        var post = "";
        var uploadChannel = subject.QueryInterface(Ci.nsIUploadChannel);
        if (uploadChannel && uploadChannel.uploadStream) {
          var len = uploadChannel.uploadStream.available();
          post = NetUtil.readInputStreamToString(uploadChannel.uploadStream, len);
        }

        // 通过Tab的Attribute传送http header和post data参数
        var param = {headers: headers, post: post};
        COBA.setTabAttributeJSON(tab, COBA.navigateParamsAttr, param);

        tab.linkedBrowser.loadURI(COBA.getCOBAURL(url));
      }
    }
  },

  _getAllRequestHeaders: function(httpChannel) {
      var visitor = function() {
        this.headers = "";
      };
      visitor.prototype.visitHeader = function(aHeader, aValue) {
        // ICBC only supports FF10 - FF21, let's fake the user agent here.
        if (aHeader == 'User-Agent' &&
            httpChannel.URI.host.endsWith('.icbc.com.cn')) {
          aValue = aValue.replace(/rv:[0-9.]+/i, 'rv:20.0').replace(/Firefox\/[0-9.]+/i, 'Firefox/20.0');
        }

        this.headers += aHeader + ":" + aValue + "\r\n";
      };
      var v = new visitor();
      httpChannel.visitRequestHeaders(v);
      return v.headers;
  },

  shouldFilter: function(url) {
    return !watcher.isCOBAURL(url)
         && !COBA.isFirefoxOnly(url)
         && watcher.isMatchFilterList(url);
  }
}

var watcher = {

   isCOBAURL: function(url) {
      if (!url) return false;
      return (url.indexOf(COBA.containerUrl) == 0);
   },

   isOfficialFilterEnabled: function() {
      return (Services.prefs.getBoolPref("extensions.coba.official.filter", true));
   },

   isFilterEnabled: function() {
      return (Services.prefs.getBoolPref("extensions.coba.filter", true));
   },
/*
   isFilterEnabled: function() {
      return (Services.prefs.getBoolPref("extensions.coba.filter", true));
   },
*/
   getAllPrefFilterList: function() {  // add official filter list
      var s = "";
      if(this.isFilterEnabled())
        s =  Services.prefs.getCharPref("extensions.coba.filterlist", "") + " ";
      if(this.isOfficialFilterEnabled())
        s += Services.prefs.getCharPref("extensions.coba.official.filterlist", "");
      return ((s == "") ? [] : s.split(" "));
   },

   getPrefOfficialFilterList: function() {  // add official filter list
      var s = "";
      if(this.isOfficialFilterEnabled())
        s = Services.prefs.getCharPref("extensions.coba.official.filterlist", "");
      return ((s == "") ? [] : s.split(" "));
   },

   getPrefFilterList: function() {
      var s = "";
      if(this.isFilterEnabled())
        s =  Services.prefs.getCharPref("extensions.coba.filterlist", "");
      return ((s == "") ? [] : s.split(" "));
   },
/*
   getPrefFilterList: function() {
      var s = Services.prefs.getCharPref("extensions.coba.filterlist", null);
      return (s ? s.split(" ") : "");
   },

   setPrefFilterList: function(list) {
      Services.prefs.setCharPref("extensions.coba.filterlist", list.join(" "));
   },
*/
   isMatchURL: function(url, pattern) {
      if ((!pattern) || (pattern.length==0)) return false;
      var retest = /^\/(.*)\/$/.exec(pattern);
      if (retest) {
         pattern = retest[1];
      } else {
         pattern = pattern.replace(/\\/g, "/");
         var m = pattern.match(/^(.+:\/\/+[^\/]+\/)?(.*)/);
         m[1] = (m[1] ? m[1].replace(/\./g, "\\.").replace(/\?/g, "[^\\/]?").replace(/\*/g, "[^\\/]*") : "");
         m[2] = (m[2] ? m[2].replace(/\./g, "\\.").replace(/\+/g, "\\+").replace(/\?/g, "\\?").replace(/\*/g, ".*") : "");
         pattern = m[1] + m[2];
         pattern = "^" + pattern + "$";
      }
      var reg = new RegExp(pattern.toLowerCase());
      return (reg.test(url.toLowerCase()));
   },

   isMatchFilterList: function(url) {
      var aList = this.getAllPrefFilterList();
      for (var i=0; i<aList.length; i++) {
         var item = aList[i].split("\b");
         var rule = item[0];
         var enabled = (item.length == 1);
         if (enabled && this.isMatchURL(url, rule))
           return(true);
      }
      return(false);
/*
      var aList = this.getPrefFilterList();
      for (var i=0; i<aList.length; i++) {
         var item = aList[i].split("\b");
         var rule = item[0];
         var enabled = (item.length == 1);
         if (enabled && this.isMatchURL(url, rule)) return(true);
      }
      return(false);
*/
   },
}
