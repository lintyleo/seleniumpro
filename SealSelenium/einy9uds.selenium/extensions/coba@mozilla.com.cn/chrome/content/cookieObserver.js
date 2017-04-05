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

Cu.import("resource://coba/cobaUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/ctypes.jsm");


/**
 * @namespace
 */
if (typeof(COBA) == "undefined") {
  var COBA = {};
}

/**
 * http://forums.mozillazine.org/viewtopic.php?f=23&t=2059667
 * anfilat2:
 * ctypes.winapi_abi works in Firefox 32bit version only and it don't works in
 * 64bit.
 * ctypes.default_abi is more universal, but don't works in 32bit callback functions.
 */
let CallBackABI = ctypes.stdcall_abi;
let WinABI = ctypes.winapi_abi;
if (ctypes.size_t.size == 8) {
  CallBackABI = ctypes.default_abi;
  WinABI = ctypes.default_abi;
}

let wininetDll = ctypes.open("Wininet.dll");

/**
 * BOOL InternetSetCookie(
 * in LPCTSTR lpszUrl,
 * in LPCTSTR lpszCookieName,
 * in LPCTSTR lpszCookieData
 * );
 */
let InternetSetCookieW = wininetDll.declare('InternetSetCookieW',
    WinABI,
    ctypes.int32_t, // BOOL
    ctypes.jschar.ptr, // LPCTSTR lpszUrl
    ctypes.int32_t, // LPCTSTR lpszCookieName
    ctypes.jschar.ptr // LPCTSTR lpszCookieData
);

let InternetSetCookieExW = wininetDll.declare('InternetSetCookieExW',
    WinABI,
    ctypes.int32_t, // BOOL
    ctypes.jschar.ptr, // LPCTSTR lpszUrl
    ctypes.jschar.ptr, // LPCTSTR lpszCookieName
    ctypes.jschar.ptr, // LPCTSTR lpszCookieData
    ctypes.uint32_t, // DWORD dwFlags
    ctypes.int32_t // DWORD_PTR dwReserved
);

const NULL = 0;
const INTERNET_COOKIE_HTTPONLY = 0x00002000;

COBA.IECookieManager = {
  saveCookie: function(cookie2, isPrivate) {
    let hostname = cookie2.host.trim();
    // Strip off beginning dot in hostname
    if (hostname.substring(0, 1) == ".")
    {
      hostname = hostname.substring(1);
    }

    /* The URL format must be correct or set cookie will fail
     * http://.baidu.com must be transformed into
     * http://baidu.com before it can be recognized
     */
    let url = (cookie2.isSecure ? 'https://' : 'http://') + hostname + cookie2.path;
    let cookieData = cookie2.name + "=" + cookie2.value + "; domain=" + cookie2.host + "; path=" + cookie2.path;
    // Force the cookie to be session cookie if we synchronized it from private browsing windows
    if (cookie2.expires > 0 && !isPrivate)
    {
      cookieData += "; expires=" + this.getExpiresString(cookie2.expires);
    }
    if (cookie2.isSecure)
    {
      cookieData += "; secure";
    }
    if (cookie2.isHttpOnly)
    {
      cookieData +="; httponly";
    }
    let ret = InternetSetCookieW(url, NULL, cookieData);
    if (!ret)
    {
      let ret = InternetSetCookieExW(url, null, cookieData, INTERNET_COOKIE_HTTPONLY, NULL);
      if (!ret)
      {
        let errCode = ctypes.winLastError || 0;
        Utils.LOG('InternetSetCookieExW failed with ERROR ' + errCode + ' url:' + url + ' data:' + cookieData);
      }
    }
    return ret;
  },

  deleteCookie: function(cookie2) {
    throw "Not implemented!";
  },

  getExpiresString: function(expiresInSeconds) {
    // Convert expires seconds to date string of the format "Tue, 28 Feb 2012 17:14:26 GMT"
    let dateString = new Date(expiresInSeconds * 1000).toGMTString();
    // Convert "Tue, 28 Feb 2012 17:14:26 GMT" to "Tue, 28-Feb-2012 17:14:26 GMT"
    return dateString.substr(0, 7) + '-' + dateString.substr(8, 3) + '-' + dateString.substr(12);
  }
};

COBA.CookieObserver = {
  register: function() {
    Services.obs.addObserver(this, "cookie-changed", false);
  },

  unregister: function() {
    Services.obs.removeObserver(this, "cookie-changed");
  },

  // nsIObserver
  observe: function(subject, topic, data) {
    switch (topic) {
      case 'cookie-changed':
        this.onCookieChanged(subject, data);
        break;
      }
  },

  onCookieChanged: function(subject, data) {
    let cookie = (subject instanceof Ci.nsICookie2) ? subject.QueryInterface(Ci.nsICookie2) : null;
    let cookieArray = (subject instanceof Ci.nsIArray) ? subject.QueryInterface(Ci.nsIArray) : null;
    switch(data) {
      case 'deleted':
        this.logCookie(data, cookie);
        break;
      case 'added':
        this.logCookie(data, cookie);
        COBA.IECookieManager.saveCookie(cookie);
        break;
      case 'changed':
        this.logCookie(data, cookie);
        COBA.IECookieManager.saveCookie(cookie);
        break;
      case 'batch-deleted':
        cobaUtils.LOG('[logCookie batch-deleted] ' + cookieArray.length + ' cookie(s)');
        for (let i=0; i<cookieArray.length; i++) {
          let cookie = cookieArray.queryElementAt(i, Ci.nsICookie2);
          this.logCookie(data, cookie);
        }
        break;
      case 'cleared':
//        cobaUtils.LOG('[logCookie cleared]');
        break;
      case 'reload':
//        cobaUtils.LOG('[logCookie reload]');
        break;
    }
  },

  logCookie: function(tag, cookie2) {
    /*
    cobaUtils.LOG('[logCookie ' + tag + "] host:" + cookie2.host + " path:" + cookie2.path +
                    " name:" + cookie2.name + " value:" + decodeURI(cookie2.value) +
                    " expires:" + new Date(cookie2.expires*1000).toGMTString() + " isHttpOnly:" + cookie2.isHttpOnly +
                    " isSession:" + cookie2.isSession);
                    */
  }
};