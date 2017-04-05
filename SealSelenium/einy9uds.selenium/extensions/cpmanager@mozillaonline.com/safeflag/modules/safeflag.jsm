/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var EXPORTED_SYMBOLS = ["safeflag"];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyServiceGetter(this, "_ucdbSvc",
  "@mozilla.org/url-classifier/dbservice;1", "nsIUrlClassifierDBService");

XPCOMUtils.defineLazyGetter(this, "lookupTables", function() {
  let prefs = Services.prefs.getBranch("urlclassifier.");
  let keys = ["malwareTable", "phishTable"];
  let getTables = function() {
    let ret = [];
    for (let key of keys) {
      ret.push(prefs.getCharPref(key));
    }
    let allTables = ret.join(",");
    let googTables = allTables.split(",").filter((table) => {
      return table.startsWith("goog-");
    }).join(",");
    let otherTables = allTables.split(",").filter((table) => {
      return !table.startsWith("goog-") && !table.startsWith("test-");
    }).join(",");
    return {
      all: allTables,
      goog: googTables,
      other: otherTables
    }
  };
  let update = function() {
    lookupTables = getTables();
  };
  for (let key of keys) {
    prefs.addObserver(key, update, false);  
  }
  return getTables();
});

function doLookup(aUrl, aTables, aCallback) {
  let principal = Services.scriptSecurityManager.
    getNoAppCodebasePrincipal(Services.io.newURI(aUrl, null, null));

  try {
    // since FF30, see <https://bugzil.la/985623>
    _ucdbSvc.lookup(principal, aTables, aCallback);
  } catch(e) {
    try {
      _ucdbSvc.lookup(principal, aCallback);
    } catch(_e) {
      aCallback("");
    }
  }
}

var safeflag = {
  lookup: function(url, callback) {
    doLookup(url, lookupTables.all, (aTableNames) => {
      if (typeof callback == "function") {
        nameArray = aTableNames.split(",");
        callback({
          isMalware: nameArray.some(t => { return t.split("-")[1] == "malware"; }),
          isPhishing: nameArray.some(t => { return t.split("-")[1] == "phish"; }),
          isUnwanted: nameArray.some(t => { return t.split("-")[1] == "unwanted"; }),
          tableNames: aTableNames
        });
      }
    });
  },

  /* Invoke callback if one of the list types hits. */
  lookup_some: function(url, callback) {
    let lookupCount = 0;
    function lookupCallback(aTableNames) {
      lookupCount--;
      if (typeof callback != "function") {
        return;
      }

      nameArray = aTableNames.split(",");
      let isMalware = nameArray.some(t => {
        return t.split("-")[1] == "malware";
      });

      let isPhishing = nameArray.some(t => {
        return t.split("-")[1] == "phish";
      });

      let isUnwanted = nameArray.some(t => {
        return t.split("-")[1] == "unwanted";
      });

      if (!isMalware && !isPhishing && !isUnwanted) {
        if (lookupCount == 0) {
          callback({
            isMalware: false,
            isPhishing: false,
            isUnwanted: false
          });
        }
        return;
      }

      let doCallback = callback;
      // Invalidate the following callbacks.
      callback = false;
      doCallback({
        isMalware: isMalware,
        isPhishing: isPhishing,
        isUnwanted: isUnwanted,
        tableNames: aTableNames
      });
    }

    ++lookupCount;
    doLookup(url, lookupTables.goog, lookupCallback);
    ++lookupCount;
    doLookup(url, lookupTables.other, lookupCallback);
  }
};
