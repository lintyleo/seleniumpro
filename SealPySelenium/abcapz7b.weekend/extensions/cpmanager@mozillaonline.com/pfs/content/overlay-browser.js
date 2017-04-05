/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.addEventListener("load", function() {
  // Same as overlay-pfs.js, only do the hacking in PFS killed versions.
  if (gPluginHandler && gPluginHandler.supportedPlugins) {
    return;
  }

  window.setTimeout(() => {
    if (gPluginHandler && gPluginHandler.openPluginUpdatePage) {
      var openPluginUpdatePage = gPluginHandler.openPluginUpdatePage;
      gPluginHandler.openPluginUpdatePage = function(aEvent) {
        /* Do nothing here, we will open the PFS dialog.*/
      }
    }

    if (gPluginHandler && gPluginHandler.showClickToPlayNotification &&
        gPluginHandler._clickToPlayNotificationEventCallback) {
      var showClickToPlayNotification =
        gPluginHandler.showClickToPlayNotification.bind(gPluginHandler);
      gPluginHandler.showClickToPlayNotification =
        function() {
          showClickToPlayNotification.apply(null, arguments)
          var browser = arguments[0];
          var plugins = arguments[1];
          var notification =
            PopupNotifications.getNotification("click-to-play-plugins", browser);
          if (!notification) {
            return;
          }
          notification.options.eventCallback = function(event) {
            gPluginHandler._clickToPlayNotificationEventCallback(event);
            if (event == "shown") {
              let notificationElement =
                document.getElementById('click-to-play-plugins-notification');

              if (!notificationElement) {
                return;
              }

              notificationElement.addEventListener('click', function(aEvt) {
                if (aEvt.originalTarget.getAttribute('anonid') ==
                    "click-to-play-plugins-notification-link") {
                  aEvt.preventDefault();
                  aEvt.stopPropagation();

                  var missingPlugins = new Map();
                  plugins.forEach(aPlugin => {
                    missingPlugins.set(aPlugin.mimetype, aPlugin);
                  });
                  openDialog("chrome://cmpfs/content/plugins/pluginInstallerWizard.xul",
                             "PFSWindow", "chrome,centerscreen,resizable=yes",
                             {plugins: missingPlugins, browser: browser});
                }
              }, true);
            }
          };
        };
    }
  }, 500);
}, false);

