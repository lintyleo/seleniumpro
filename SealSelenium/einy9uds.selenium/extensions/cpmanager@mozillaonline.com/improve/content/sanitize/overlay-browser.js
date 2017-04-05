(function() {
  let gCHNotificationInfoBar = {

    handleEvent: function Improve_CE__handleEvent(aEvent) {
      switch (aEvent.type) {
        case "load":
          setTimeout(() => {
	    this.init();
	  }, 1000);
          break;
      }
    },

    _CLEAE_HISTORY_NOTIFICATION: "clear-history",

    get _notificationBox() {
      delete this._notificationBox;
      var box = document.getElementById("global-notificationbox") || gBrowser.getNotificationBox();
      return this._notificationBox = box;
    },

    init: function() {
      if (Application.prefs.getValue("extensions.cmimprove.clearhistory.notification.shown", false)) {
        return;
      }
      this._displayInfoBar();
      Application.prefs.setValue("extensions.cmimprove.clearhistory.notification.shown", true);
    },

    _getNotification: function (name) {
      name = name || this._CLEAE_HISTORY_NOTIFICATION;
      return this._notificationBox.getNotificationWithValue(name);
    },

    _displayInfoBar: function () {
      var _bundles = Cc["@mozilla.org/intl/stringbundle;1"].
              getService(Ci.nsIStringBundleService).
              createBundle("chrome://cmimprove/locale/browser.properties");
      function getString(key) {
        return _bundles.GetStringFromName(key);
      }

      if (this._getNotification()) {
        return;
      }

      let message = getString("ce.clearHistory.message");
      let buttons = [{
        label: getString("ce.clearHistory.button.label"),
        accessKey: getString("ce.clearHistory.button.accessKey"),
        popup: null,
        callback: function () {
          openPreferences("paneMain");
        },
      }];

      let notification = this._notificationBox.appendNotification(
        message,
        this._CLEAE_HISTORY_NOTIFICATION,
        null,
        this._notificationBox.PRIORITY_INFO_HIGH,
        buttons,
        function onEvent(event) {
          if (event == "removed") {
            this._clearNotification();
          }
        }.bind(this)
      );
    },

    _clearNotification: function () {
      let notification = this._getNotification();
      if (notification) {
        notification.close();
      }
    },

  };
//  window.addEventListener("load", gCHNotificationInfoBar, false)
})();
