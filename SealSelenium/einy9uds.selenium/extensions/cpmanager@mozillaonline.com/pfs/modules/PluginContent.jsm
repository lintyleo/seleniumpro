/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;

this.EXPORTED_SYMBOLS = [ "CMPluginContent" ];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  'resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyGetter(this, "gNavigatorBundle", function() {
  const url = "chrome://browser/locale/browser.properties";
  return Services.strings.createBundle(url);
});

XPCOMUtils.defineLazyGetter(this, "cmpfsNavigatorBundle", function() {
  const url = "chrome://cmpfs/locale/browser.properties";
  return Services.strings.createBundle(url);
});

function CMPluginContent(aGlobal) {
  this.init(aGlobal);
}

CMPluginContent.prototype = {
  init: function(aGlobal) {
    this.global = aGlobal;
    // Need to hold onto the content window or else it'll get destroyed
    this.content = this.global.content;

    this.global.addEventListener("PluginBindingAttached", this, true, true);
    this.global.addEventListener("unload",                this);
  },

  uninit: function() {
    delete this.global;
    delete this.content;
  },

  getPluginUI: function (plugin, anonid) {
    return plugin.ownerDocument.
           getAnonymousElementByAttribute(plugin, "anonid", anonid);
  },

  createInstallStatusElem: function(plugin) {
    let document = plugin.ownerDocument;
    let managePlugins = document.
      getAnonymousElementByAttribute(plugin, 'class', 'msg msgManagePlugins');
    if (!managePlugins)
        return null;

    let div = document.createElement('div');
    div.className = 'installStatus';
    div.setAttribute('anonid', 'installStatus');

    let divChild = document.createElement('div');
    divChild.className = 'msg msgInstallPlugin';
    // The style rule to control the visibility is removed from pluginProblemContent.css,
    // let's add it manually here.
    divChild.style.display = 'block';

    let divAnchor = document.createElement('a');
    divAnchor.className = 'action-link';
    divAnchor.setAttribute('anonid', 'installPluginLink');
    divAnchor.textContent = cmpfsNavigatorBundle.GetStringFromName('installPlugin');

    divChild.appendChild(divAnchor);
    div.appendChild(divChild);

    managePlugins.parentNode.insertBefore(div, managePlugins);

    return div;
  },

  addLinkClickCallback: function (linkNode, callbackName /*callbackArgs...*/) {
    // XXX just doing (callback)(arg) was giving a same-origin error. bug?
    let self = this;
    let callbackArgs = Array.prototype.slice.call(arguments).slice(2);
    linkNode.addEventListener("click",
                              function(evt) {
                                if (!evt.isTrusted)
                                  return;
                                evt.preventDefault();
                                if (callbackArgs.length == 0)
                                  callbackArgs = [ evt ];
                                (self[callbackName]).apply(self, callbackArgs);
                              },
                              true);

    linkNode.addEventListener("keydown",
                              function(evt) {
                                if (!evt.isTrusted)
                                  return;
                                if (evt.keyCode == evt.DOM_VK_RETURN) {
                                  evt.preventDefault();
                                  if (callbackArgs.length == 0)
                                    callbackArgs = [ evt ];
                                  evt.preventDefault();
                                  (self[callbackName]).apply(self, callbackArgs);
                                }
                              },
                              true);
  },

  // Helper to get the binding handler type from a plugin object
  _getBindingType : function(plugin) {
    if (!(plugin instanceof Ci.nsIObjectLoadingContent))
      return null;

    switch (plugin.pluginFallbackType) {
      case Ci.nsIObjectLoadingContent.PLUGIN_UNSUPPORTED:
        return "PluginNotFound";
      case Ci.nsIObjectLoadingContent.PLUGIN_DISABLED:
        return "PluginDisabled";
      case Ci.nsIObjectLoadingContent.PLUGIN_BLOCKLISTED:
        return "PluginBlocklisted";
      case Ci.nsIObjectLoadingContent.PLUGIN_OUTDATED:
        return "PluginOutdated";
      case Ci.nsIObjectLoadingContent.PLUGIN_CLICK_TO_PLAY:
        return "PluginClickToPlay";
      case Ci.nsIObjectLoadingContent.PLUGIN_VULNERABLE_UPDATABLE:
        return "PluginVulnerableUpdatable";
      case Ci.nsIObjectLoadingContent.PLUGIN_VULNERABLE_NO_UPDATE:
        return "PluginVulnerableNoUpdate";
      case Ci.nsIObjectLoadingContent.PLUGIN_PLAY_PREVIEW:
        return "PluginPlayPreview";
      default:
        // Not all states map to a handler
        return null;
    }
  },

  isKnownPlugin: function (objLoadingContent) {
    return (objLoadingContent.getContentTypeForMIMEType(objLoadingContent.actualType) ==
            Ci.nsIObjectLoadingContent.TYPE_PLUGIN);
  },

  // Map the plugin's name to a filtered version more suitable for user UI.
  makeNicePluginName : function (aName) {
    if (aName == "Shockwave Flash")
      return "Adobe Flash";

    // Clean up the plugin name by stripping off parenthetical clauses,
    // trailing version numbers or "plugin".
    // EG, "Foo Bar (Linux) Plugin 1.23_02" --> "Foo Bar"
    // Do this by first stripping the numbers, etc. off the end, and then
    // removing "Plugin" (and then trimming to get rid of any whitespace).
    // (Otherwise, something like "Java(TM) Plug-in 1.7.0_07" gets mangled)
    let newName = aName.replace(/\(.*?\)/g, "").
                        replace(/[\s\d\.\-\_\(\)]+$/, "").
                        replace(/\bplug-?in\b/i, "").trim();
    return newName;
  },

  _getPluginInfo: function (pluginElement) {
    let pluginHost = Cc["@mozilla.org/plugin/host;1"].getService(Ci.nsIPluginHost);
    pluginElement.QueryInterface(Ci.nsIObjectLoadingContent);

    let tagMimetype;
    let pluginName = gNavigatorBundle.GetStringFromName("pluginInfo.unknownPlugin");
    let pluginTag = null;
    let permissionString = null;
    let fallbackType = null;
    let blocklistState = null;

    tagMimetype = pluginElement.actualType;
    if (tagMimetype == "") {
      tagMimetype = pluginElement.type;
    }

    if (this.isKnownPlugin(pluginElement)) {
      pluginTag = pluginHost.getPluginTagForType(pluginElement.actualType);
      pluginName = this.makeNicePluginName(pluginTag.name);

      permissionString = pluginHost.getPermissionStringForType(pluginElement.actualType);
      fallbackType = pluginElement.defaultFallbackType;
      blocklistState = pluginHost.getBlocklistStateForType(pluginElement.actualType);
      // Make state-softblocked == state-notblocked for our purposes,
      // they have the same UI. STATE_OUTDATED should not exist for plugin
      // items, but let's alias it anyway, just in case.
      if (blocklistState == Ci.nsIBlocklistService.STATE_SOFTBLOCKED ||
          blocklistState == Ci.nsIBlocklistService.STATE_OUTDATED) {
        blocklistState = Ci.nsIBlocklistService.STATE_NOT_BLOCKED;
      }
    }

    return { mimetype: tagMimetype,
             pluginName: pluginName,
             pluginTag: pluginTag,
             permissionString: permissionString,
             fallbackType: fallbackType,
             blocklistState: blocklistState,
           };
  },

  showInstallNotification: function (plugin) {
    let [shown] = this.global.sendSyncMessage("PluginContent:CMShowInstallNotification", {
      pluginInfo: this._getPluginInfo(plugin),
    });
    return shown;
  },

  // Callback for user clicking on a missing (unsupported) plugin.
  installSinglePlugin: function(plugin) {
    this.global.sendAsyncMessage("PluginContent:CMInstallSinglePlugin", {
      pluginInfo: this._getPluginInfo(plugin),
    });
  },

  handleEvent: function (event) {
    let eventType = event.type;

    if (eventType == "unload") {
      this.uninit();
      return;
    }

    let plugin = event.target;
    let doc = plugin.ownerDocument;

    if (!(plugin instanceof Ci.nsIObjectLoadingContent))
      return;

    if (eventType == "PluginBindingAttached") {
      // The plugin binding fires this event when it is created.
      // As an untrusted event, ensure that this object actually has a binding
      // and make sure we don't handle it twice
      let overlay = this.getPluginUI(plugin, "main");

      // XXX _bindingHandled will be set in PluginContent.jsm, let's rename it here
      // to make sure PluginNotFound is handled.
      if (!overlay || overlay._cmpfsBindingHandled) {
        return;
      }
      overlay._cmpfsBindingHandled = true;

      // Lookup the handler for this binding
      eventType = this._getBindingType(plugin);
      if (!eventType) {
        // Not all bindings have handlers
        return;
      }
    }

    let shouldShowNotification = false;
    switch (eventType) {
      case "PluginNotFound": {
        let installable = this.showInstallNotification(plugin, eventType);
        let contentWindow = plugin.ownerDocument.defaultView;
        // For non-object plugin tags, register a click handler to install the
        // plugin. Object tags can, and often do, deal with that themselves,
        // so don't stomp on the page developers toes.
        if (installable && !(plugin instanceof contentWindow.HTMLObjectElement)) {
          let installStatus = this.getPluginUI(plugin, "installStatus");
          // installStatus button is removed, let's add it back.
          if (!installStatus) {
            installStatus = this.createInstallStatusElem(plugin);
          }

          if (!installStatus) {
            // Failed to create the installStatus elemement
            return;
          }

          installStatus.setAttribute("installable", "true");
          let iconStatus = this.getPluginUI(plugin, "icon");
          iconStatus.setAttribute("installable", "true");

          let installLink = this.getPluginUI(plugin, "installPluginLink");
          this.addLinkClickCallback(installLink, "installSinglePlugin", plugin);
        }
        break;
      }
      case "PluginVulnerableUpdatable":
        this.addLinkClickCallback(this.getPluginUI(plugin, "checkForUpdatesLink"),
          "installSinglePlugin", plugin);
        break;
    }
  }
};

