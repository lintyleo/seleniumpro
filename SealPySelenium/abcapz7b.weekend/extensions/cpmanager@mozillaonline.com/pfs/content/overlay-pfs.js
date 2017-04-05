/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  const mm = window.messageManager;
  const MSG_INSTALL_NOTI = "PluginContent:CMShowInstallNotification";
  const MSG_INSTALL_SING = "PluginContent:CMInstallSinglePlugin";

  XPCOMUtils.defineLazyGetter(this, 'cmpfsNavigatorBundle', function () {
    return document.getElementById('cmpfs_bundle_browser');
  });

  let pluginHandler = {
    PREF_NOTIFY_MISSING_FLASH: "plugins.notifyMissingFlash",
    PREF_HIDE_MISSING_PLUGINS_NOTIFICATION: "plugins.hideMissingPluginsNotification",
    supportedPlugins: {
      "mimetypes": {
        "application/x-shockwave-flash": "flash",
        "application/futuresplash": "flash",
        "application/x-java-.*": "java",
        "application/x-director": "shockwave",
        "application/(sdp|x-(mpeg|rtsp|sdp))": "quicktime",
        "audio/(3gpp(2)?|AMR|aiff|basic|mid(i)?|mp4|mpeg|vnd\.qcelp|wav|x-(aiff|m4(a|b|p)|midi|mpeg|wav))": "quicktime",
        "image/(pict|png|tiff|x-(macpaint|pict|png|quicktime|sgi|targa|tiff))": "quicktime",
        "video/(3gpp(2)?|flc|mp4|mpeg|quicktime|sd-video|x-mpeg)": "quicktime",
        "application/x-unknown": "test",
      },

      "plugins": {
        "flash": {
          "displayName": "Flash",
          "installWINNT": true,
          "installDarwin": true,
          "installLinux": true,
        },
        "java": {
          "displayName": "Java",
          "installWINNT": true,
          "installDarwin": true,
          "installLinux": true,
        },
        "shockwave": {
          "displayName": "Shockwave",
          "installWINNT": true,
          "installDarwin": true,
        },
        "quicktime": {
          "displayName": "QuickTime",
          "installWINNT": true,
        },
        "test": {
          "displayName": "Test plugin",
          "installWINNT": true,
          "installLinux": true,
          "installDarwin": true,
        }
      }
    },

    nameForSupportedPlugin: function (aMimeType) {
      for (let type in this.supportedPlugins.mimetypes) {
        let re = new RegExp(type);
        if (re.test(aMimeType)) {
          return this.supportedPlugins.mimetypes[type];
        }
      }
      return null;
    },

    canInstallThisMimeType: function (aMimeType) {
      let os = Services.appinfo.OS;
      let pluginName = this.nameForSupportedPlugin(aMimeType);
      if (pluginName && "install" + os in this.supportedPlugins.plugins[pluginName]) {
        return true;
      }
      return false;
    },

    newPluginInstalled : function(event) {
      // browser elements are anonymous so we can't just use target.
      var browser = event.originalTarget;
      // clear the plugin list, now that at least one plugin has been installed
      browser.missingPlugins = null;

      var notificationBox = gBrowser.getNotificationBox(browser);
      var notification = notificationBox.getNotificationWithValue("missing-plugins");
      if (notification)
        notificationBox.removeNotification(notification);

      // reload the browser to make the new plugin show.
      browser.reload();
    },

    // Callback for user clicking on a missing (unsupported) plugin.
    installSinglePlugin: function (pluginInfo) {
      var missingPlugins = new Map();
      missingPlugins.set(pluginInfo.mimetype, pluginInfo);

      openDialog("chrome://cmpfs/content/plugins/pluginInstallerWizard.xul",
                 "PFSWindow", "chrome,centerscreen,resizable=yes",
                 {plugins: missingPlugins, browser: gBrowser.selectedBrowser});
    },

    showInstallNotification: function(browser, pluginInfo) {
      let hideMissingPluginsNotification =
        Services.prefs.getBoolPref(this.PREF_HIDE_MISSING_PLUGINS_NOTIFICATION);
      if (hideMissingPluginsNotification) {
        return false;
      }

      if (!browser.missingPlugins)
        browser.missingPlugins = new Map();

      browser.missingPlugins.set(pluginInfo.mimetype, pluginInfo);

      // only show notification for small subset of plugins
      let mimetype = pluginInfo.mimetype.split(";")[0];
      if (!this.canInstallThisMimeType(mimetype))
        return false;

      let pluginIdentifier = this.nameForSupportedPlugin(mimetype);
      if (!pluginIdentifier)
        return false;

      let displayName = this.supportedPlugins.plugins[pluginIdentifier].displayName;

      // don't show several notifications
      let notification = PopupNotifications.getNotification("plugins-not-found", browser);
      if (notification)
        return true;

      let messageString = cmpfsNavigatorBundle.getString("installPlugin.message");
      let mainAction = {
        label: cmpfsNavigatorBundle.getFormattedString("installPlugin.button.label",
                                                       [displayName]),
        accessKey: cmpfsNavigatorBundle.getString("installPlugin.button.accesskey"),
        callback: function () {
          openDialog("chrome://cmpfs/content/plugins/pluginInstallerWizard.xul",
                     "PFSWindow", "chrome,centerscreen,resizable=yes",
                     {plugins: browser.missingPlugins, browser: browser});
        }
      };
      let secondaryActions = null;
      let options = { dismissed: true };

      let showForFlash = Services.prefs.getBoolPref(this.PREF_NOTIFY_MISSING_FLASH);
      if (pluginIdentifier == "flash" && showForFlash) {
        let prefNotifyMissingFlash = this.PREF_NOTIFY_MISSING_FLASH;
        secondaryActions = [{
          label: cmpfsNavigatorBundle.getString("installPlugin.ignoreButton.label"),
          accessKey: cmpfsNavigatorBundle.getString("installPlugin.ignoreButton.accesskey"),
          callback: function () {
            Services.prefs.setBoolPref(prefNotifyMissingFlash, false);
          }
        }];
        options.dismissed = false;
      }
      PopupNotifications.show(browser, "plugins-not-found",
                              messageString, "plugin-install-notification-icon",
                              mainAction, secondaryActions, options);
      return true;
    },

    receiveMessage: function (msg) {
      switch (msg.name) {
        case MSG_INSTALL_SING:
          this.installSinglePlugin(msg.data.pluginInfo);
          break;
        case MSG_INSTALL_NOTI:
          return this.showInstallNotification(msg.target, msg.data.pluginInfo);
      }
    }
  };

  let tabProgressListener = {
    onLocationChange: function(aWebProgress, aRequest, aLocation,
                               aFlags) {
      let browser = gBrowser.selectedBrowser;

      // Clear out the missing plugins list since it's related to the
      // previous location.
      browser.missingPlugins = null;
    }
  };

  function init() {
    // Check if PFS is killed. We only bring PFS back for PFS-died Firefox.
    if (gPluginHandler && gPluginHandler.supportedPlugins) {
      return;
    }

    gBrowser.addEventListener("NewPluginInstalled",
      pluginHandler.newPluginInstalled, true);
    gBrowser.addProgressListener(tabProgressListener);

    mm.addMessageListener(MSG_INSTALL_NOTI, pluginHandler);
    mm.addMessageListener(MSG_INSTALL_SING, pluginHandler);

    mm.loadFrameScript(
      'chrome://cmpfs/content/pluginContentChild.js', true);
  }

  function uninit() {
    mm.removeMessageListener(MSG_INSTALL_NOTI, pluginHandler);
    mm.removeMessageListener(MSG_INSTALL_SING, pluginHandler);
  }

  window.addEventListener('load', function onload() {
    window.removeEventListener('load', onload);
    setTimeout(() => {
      init();
    }, 100);
  });

  window.addEventListener('unload', uninit);
})();
