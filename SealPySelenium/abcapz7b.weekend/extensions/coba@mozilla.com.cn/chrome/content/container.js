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

Cu.import("resource://coba/cobaUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PlacesUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");

var tracking_random = Math.random();
function tracking(type){
  var tracker = Components.classes["@mozilla.com.cn/tracking;1"];
  if (!tracker || !tracker.getService().wrappedJSObject.ude) {
    return;
  }
  try{
    var _uuidprf = 'extensions.coba.uuid';
    var uuid = Preferences.get(_uuidprf, '');
    if (uuid == ''){
      var uuidgen = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);
      uuid = uuidgen.generateUUID().number;
      Preferences.set(_uuidprf, uuid);
    }
    var _trackurl = 'http://addons.g-fox.cn/coba.gif';
    var image = new Image();
    image.src = _trackurl + '?r=' + tracking_random
              + '&uuid=' + uuid
              + '&type=' + type
              ;
  }catch(e){}
}
var _tracking_Complete = false;
function tracking_onLoadComplete(){
  if(!_tracking_Complete){
    _tracking_Complete = true;
    tracking("LoadComplete");
  }
}


var COBAContainer = {
	init: function() {
	  tracking("init");
		window.removeEventListener('DOMContentLoaded', COBAContainer.init, false);
		var container = document.getElementById('container');
		if (!container) {
			cobaUtils.ERROR('Cannot find container to insert coba-object.');
			return;
		}
		if (COBAContainer._isInPrivateBrowsingMode()) {
			container.innerHTML = '<iframe src="PrivateBrowsingWarning.xhtml" width="100%" height="100%" frameborder="no" border="0" marginwidth="0" marginheight="0" scrolling="no" allowtransparency="yes"></iframe>';
		} else {
			COBAContainer._registerEventHandler();
		}
		window.setTimeout(function() {
			var pluginObject = document.getElementById(COBA.objectID);;
			document.title = pluginObject.Title;
		}, 200);
	},

	destroy: function(event) {
		window.removeEventListener('unload', COBAContainer.destroy, false);
		COBAContainer._unregisterEventHandler();
	},

	_getNavigateParam: function(name) {
		var headers = "";
		var tab = cobaUtils.getTabFromDocument(document);
		var navigateParams = cobaUtils.getTabAttributeJSON(tab, COBA.navigateParamsAttr);
		if (navigateParams && typeof navigateParams[name] != "undefined") {
			headers = navigateParams[name];
		}
		return headers;
	},

	getNavigateHeaders: function() {
		return this._getNavigateParam("headers");
	},

	getNavigatePostData: function() {
		return this._getNavigateParam("post");
	},

	getNavigateWindowId: function() {
		return this._getNavigateParam("id") + "";
	},

	removeNavigateParams: function() {
		var tab = cobaUtils.getTabFromDocument(document);
		var navigateParams = cobaUtils.getTabAttributeJSON(tab, COBA.navigateParamsAttr);
		if (navigateParams) {
			tab.removeAttribute(COBA.navigateParamsAttr);
		}
	},

	_isInPrivateBrowsingMode: function() {
		var pbs;
		try { pbs = Cc["@mozilla.org/privatebrowsing;1"].getService(Ci.nsIPrivateBrowsingService); } catch (e) {}
		var privatebrowsingwarning = pbs && pbs.privateBrowsingEnabled && Services.prefs.getBoolPref("extensions.coba.privatebrowsingwarning", true);

		if (privatebrowsingwarning) {
			var cookieService = Cc["@mozilla.org/cookieService;1"].getService(Ci.nsICookieService);
			try {
				var pbwFlag = cookieService.getCookieString(Services.io.newURI("http://coba/", null, null), null);
				if (pbwFlag) {
					privatebrowsingwarning = pbwFlag.indexOf("privatebrowsingwarning=no") < 0;
					Services.cookies.remove("coba", "privatebrowsingwarning", "/", false);
				}
			}
			catch (e) {ERROR(e)}
		}

		return privatebrowsingwarning;
	},

	_registerEventHandler: function() {
		window.addEventListener("PluginNotFound", COBAContainer._pluginNotFoundListener, false);
		window.addEventListener("IeTitleChanged", COBAContainer._onTitleChanged, false);
		window.addEventListener("CloseIETab", COBAContainer._onCloseIETab, false);
		window.addEventListener("Loading", COBAContainer._onLoading, false);
		window.addEventListener("LoadComplete", COBAContainer._onLoadComplete, false);
		var pluginObject = document.getElementById(COBA.objectID);
		if (pluginObject) {
			pluginObject.addEventListener("focus", COBAContainer._onPluginFocus, false);
		}
	},

  _unregisterEventHandler: function(){
		window.removeEventListener("PluginNotFound", COBAContainer._pluginNotFoundListener, false);
		window.removeEventListener("IeTitleChanged", COBAContainer._onTitleChanged, false);
		window.removeEventListener("CloseIETab", COBAContainer._onCloseIETab, false);
		window.removeEventListener("Loading", COBAContainer._onLoading, false);
		window.removeEventListener("LoadComplete", COBAContainer._onLoadComplete, false);
		var pluginObject = document.getElementById(COBA.objectID);
		if (pluginObject) {
			pluginObject.removeEventListener("focus", COBAContainer._onPluginFocus, false);
		}
  },

	_pluginNotFoundListener: function(event) {
		alert("Loading COBA plugin failed. Please try restarting Firefox.");
	},

	/** 响应Plugin标题变化事件 */
	_onTitleChanged: function(event) {
		var title = event.detail;
		document.title = title;
	},

	/** 响应关闭IE标签窗口事件 */
	_onCloseIETab: function(event) {
		window.setTimeout(function() {
			window.close();
		}, 100);
	},
  firefoxFilterList : [
                      ],
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
  isMatchFilterList : function(url) {
    var aList = this.firefoxFilterList;
    for (var i=0; i<aList.length; i++) {
       var rule = aList[i];
       if (this.isMatchURL(url, rule))
         return true;
    }
    return false;
  },
	/** 响应开始加载事件*/
	_onLoading: function(event) {
    var pluginObject = event.originalTarget;
    var url = pluginObject.URL;
    if(COBAContainer.isMatchFilterList(url)){
      Services.obs.notifyObservers(document, "COBA-swith-to-ie", null);
    }
	},
	/** 响应加载完成事件 */
	_onLoadComplete: function(event) {

	  tracking_onLoadComplete();
    var pluginObject = event.originalTarget;
    var url = pluginObject.FaviconURL;

    var icon = document.getElementById("icon");
    icon.setAttribute("href",url);
    icon.parentNode.appendChild(icon);
	},

	/**
	 * 当焦点在plugin对象上时，在plugin中按Alt+XXX组合键时
	 * 菜单栏无法正常弹出，因此当plugin对象得到焦点时，需要
	 * 调用其blus方法去除焦点
	 */
	_onPluginFocus: function(event) {
		var pluginObject = event.originalTarget;
		pluginObject.blur();
		pluginObject.Focus();
	}
}

window.addEventListener('DOMContentLoaded', COBAContainer.init, false);
window.addEventListener('unload', COBAContainer.destroy, false);
