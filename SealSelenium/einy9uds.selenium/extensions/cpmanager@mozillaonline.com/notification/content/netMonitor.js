(function() {
	var Cc = Components.classes;
	var Ci = Components.interfaces;
	var Cu = Components.utils;

	var progListener = {
		QueryInterface: function(iid) {
			if (iid.equals(Ci.nsISupports) ||
				iid.equals(Ci.nsISupportWeakReference) ||
				iid.equals(Ci.nsIWebProgressListener)) {
				return this;
			}

			throw Cr.NS_ERROR_NO_INTERFACE;
		},

		onStateChange: function() {},
		onProgressChange: function() {},
		onStatusChange: function() {},
		onSecurityChange: function() {},
		onLocationChange: function(webProgress, request, uri) {
			var tabId = MOA.AN.Lib.getTabIdForWindow(webProgress.DOMWindow);
			MOA.AN.RuleCenter.checkAndShow({ URI: uri }, { tabId: tabId, isWindowURI: true });
			MOA.AN.Notification.showNotification(webProgress);
		},

		handleEvent: function(event) {
			MOA.AN.Notification.onTabClose(event.target.linkedPanel);
		}
	};

	window.addEventListener('load', function(evt) {
		if ((Services.prefs.getCharPref('general.useragent.locale') != 'zh-CN') || (Services.appinfo.OS == 'Linux')) {
			MOA.debug('general.useragent.locale is not zh-CN, no daily tip or addon recommendation should be displayed');
			return;
		}

		// do not use any mask which cause an "error" on Firefox5:
		// Error: gBrowser.addProgressListener was called with a second argument, which is not supported. See bug 608628.
		// Source: chrome://browser/content/tabbrowser.xml
		// Line: 1840
		gBrowser.addProgressListener(progListener/*, Ci.nsIWebProgress.NOTIFY_LOCATION*/);
		gBrowser.tabContainer.addEventListener('TabClose', progListener, false);

		window.addEventListener('unload', function(evt) {
			gBrowser.removeProgressListener(progListener);
			gBrowser.tabContainer.removeEventListener('TabClose', progListener, false);
		}, false);

		// Set a interval, make sure that page is loaded and star-button is shown.
		window.setTimeout(function() {
			// MOA.AN.Notification.showFunctionTip();
			MOA.AN.Notification.showDayTip();
		}, 1000 * 15);
	}, false);

})();
