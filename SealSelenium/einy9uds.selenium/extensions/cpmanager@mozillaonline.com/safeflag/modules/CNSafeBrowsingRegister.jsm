/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ["mozCNSafeBrowsing"];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "SafeBrowsing",
  "resource://gre/modules/SafeBrowsing.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "setTimeout",
  "resource://gre/modules/Timer.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "clearTimeout",
  "resource://gre/modules/Timer.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "dbService",
  "@mozilla.org/url-classifier/dbservice;1", "nsIUrlClassifierDBService");
XPCOMUtils.defineLazyServiceGetter(this, "listManager",
  "@mozilla.org/url-classifier/listmanager;1", "nsIUrlListManager");

XPCOMUtils.defineLazyGetter(this, "CETracking", function() {
  return Cc["@mozilla.com.cn/tracking;1"].getService().wrappedJSObject;
});

let mozCNSafeBrowsing = {
  providers: [],

  delayedPref: "extensions.cpmanager.safeflag.delayed.",
  listTypesPref: "extensions.cpmanager.safeflag.listtypes.",
  percentPref: "extensions.cpmanager.safeflag.percent.",
  slugPref: "extensions.cpmanager.safeflag.slug.",
  urlPref: "extensions.cpmanager.safeflag.provider.",

  cachedLookupTables: {},
  get lookupBranch() {
    let prefix = "urlclassifier.";

    // use default branch so we don't have to clear it on next startup
    delete this.lookupBranch;
    return this.lookupBranch = Services.prefs.getDefaultBranch(prefix);
  },

  latestUpdateKey: "extensions.cpmanager.safeflag.latestUpdate",
  delayTimeout: undefined,
  delayTimeSpan: (4 * 3600e3),
  get latestUpdate() {
    let latestUpdate = 0;
    try {
      latestUpdate = Services.prefs.getIntPref(this.latestUpdateKey) * 60e3;
    } catch(e) {};
    return latestUpdate;
  },
  set latestUpdate(latestUpdate) {
    try {
      latestUpdate = Math.ceil(latestUpdate / 60e3);
      Services.prefs.setIntPref(this.latestUpdateKey, latestUpdate);
    } catch(e) {};
  },
  get updateDelay() {
    let latestUpdate = this.latestUpdate;
    let now = Date.now();
    if (!latestUpdate || latestUpdate > now) {
      return Math.ceil(Math.random() * this.delayTimeSpan);
    }

    let sinceLastUpdate = now - latestUpdate;
    return this.delayTimeSpan - sinceLastUpdate % this.delayTimeSpan;
  },

  onHttpRequest: function(aSubject) {
    let channel = aSubject;
    channel.QueryInterface(Ci.nsIHttpChannel);
    let uri = channel.originalURI;

    this.providers.some((provider) => {
      let match = provider.gethashURL == uri.asciiSpec;
      if (match) {
        CETracking.track("sb-gethash-" + provider.slug);
      }
      return match;
    });
  },

  onHttpResponse: function(aSubject) {
    let channel = aSubject;
    channel.QueryInterface(Ci.nsIHttpChannel);
    let uri = channel.originalURI;

    this.providers.some((provider) => {
      let match = provider.updateURL == uri.asciiSpec;
      if (match && provider.delayed) {
        if (channel.responseStatus == 200) {
          this.latestUpdate = Date.now();
        }
      }
      return match;
    });
  },

  defaultPrefTweak: function() {
    for (let tablePref in this.cachedLookupTables) {
      let tables = this.cachedLookupTables[tablePref];
      this.lookupBranch.setCharPref(tablePref, tables);
    }
  },

  addListsToLookup: function(aListsToLookup) {
    // Enable lookup of additional list types.
    let tableForTypes = {
      "malware": "malwareTable",
      "phish": "phishTable"
    }
    for (let type in aListsToLookup) {
      let tablePref = tableForTypes[type];
      let originalTables = this.lookupBranch.getCharPref(tablePref);
      let tables = originalTables + "," + aListsToLookup[type].join(",");
      this.cachedLookupTables[tablePref] = tables;
      this.lookupBranch.setCharPref(tablePref, tables);
    }
  },

  init: function() {
    // user pref set in previous versions
    if (Services.prefs.prefHasUserValue("urlclassifier.phishTable")) {
      Services.prefs.clearUserPref("urlclassifier.phishTable");
    }

    let urlPrefs = Services.prefs.getChildList(this.urlPref);
    let listsToLookup = {};
    for (let urlPref of urlPrefs) {
      let id = urlPref.slice(this.urlPref.length);

      let delayed = Services.prefs.getBoolPref(this.delayedPref + id);
      let listTypes = Services.prefs.getCharPref(this.listTypesPref + id);
      let percent = Services.prefs.getIntPref(this.percentPref + id);
      let slug = Services.prefs.getCharPref(this.slugPref + id);
      let url = Services.prefs.getCharPref(urlPref);

      let provider = {
        delayed: delayed,
        gethashURL: url.replace("%PATH%", "gethash"),
        listTypes: listTypes.split(","),
        ratio: (percent / 100),
        slug: slug,
        updateURL: url.replace("%PATH%", "downloads")
      };

      // Existence of "...provider.{slug}.{last,next}updatetime" prefs will
      // make Fx try to register the relevant providers.
      let prefix = "browser.safebrowsing.provider." + slug + ".";
      if (Services.prefs.getChildList(prefix, {}).length > 0) {
        let providerBranch = Services.prefs.getDefaultBranch(prefix);
        providerBranch.setCharPref("gethashURL", provider.gethashURL);
        providerBranch.setCharPref("lists", provider.listTypes.join(","));
        providerBranch.setCharPref("updateURL", provider.updateURL);

        for (let listType of provider.listTypes) {
          let type = listType.split("-")[1];
          listsToLookup[type] = listsToLookup[type] || [];
          listsToLookup[type].push(listType);
        }
      } else {
        this.providers.push(provider);
      }
    }

    this.addListsToLookup(listsToLookup);

    if (this.providers.length) {
      this.maybeRegister();
    }
  },

  maybeRegister: function() {
    // Same here, we need to make sure the internal safe browsing has been
    // initialized, so the gethashurl won't be override.
    if (!SafeBrowsing.initialized) {
      this.delayTimeout = setTimeout(() => {
        this.maybeRegister()
      }, 1e3);
      return;
    }

    clearTimeout(this.delayTimeout);

    dbService.getTables((tables) => {
      let listsToLookup = {};
      let listsToDelayUpdate = [];

      for (let provider of this.providers) {
        let enableIfNotAlready = Math.random() <= provider.ratio;

        for (let listType of provider.listTypes) {
          let alreadyEnabled = tables.indexOf(listType) > -1;

          if (!alreadyEnabled && !enableIfNotAlready) {
            continue;
          }

          let type = listType.split("-")[1];
          listsToLookup[type] = listsToLookup[type] || [];
          listsToLookup[type].push(listType);

          try {
            listManager.registerTable(listType,
              provider.updateURL, provider.gethashURL);
          } catch(ex) {
            // Extra providerName required since Fx 44 <https://bugzil.la/1175562>
            if (ex.result == Cr.NS_ERROR_XPC_NOT_ENOUGH_ARGS) {
              listManager.registerTable(listType, provider.slug,
                provider.updateURL, provider.gethashURL);
            }
          }
          if (!provider.delayed) {
            listManager.enableUpdate(listType);
          } else {
            listsToDelayUpdate.push(listType);
          }
        }
      }
      // `maybeToggleUpdateChecking` is introduced in <https://bugzil.la/1036684>
      if (listManager.maybeToggleUpdateChecking) {
        listManager.maybeToggleUpdateChecking();
      }

      this.addListsToLookup(listsToLookup);

      this.delayTimeout = setTimeout(() => {
        listsToDelayUpdate.forEach(aListType => {
          listManager.enableUpdate(aListType);
        });

        // `maybeToggleUpdateChecking` is introduced in <https://bugzil.la/1036684>
        if (listManager.maybeToggleUpdateChecking) {
          listManager.maybeToggleUpdateChecking();
        }
      }, this.updateDelay);
    });
  }
};
