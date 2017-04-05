/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const Cr = Components.results;
const Ci = Components.interfaces;
const Cc = Components.classes;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "FxaSwitcher",
  "chrome://cmimprove/content/fxa/serviceSwitcher.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");

let _bundles = null;
function _(key) {
  if (!_bundles) {
    _bundles = Services.strings.createBundle("chrome://cmimprove/locale/fxa.properties");
  }

  return _bundles.GetStringFromName(key);
}

function mozCNFxaSwitcher() {}

mozCNFxaSwitcher.prototype = {
  classID: Components.ID('{9a52065c-1cdc-4605-bf36-1ac1f0129bf7}'),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),

  // nsIObserver
  observe: function MCF_observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case 'profile-after-change':
        Services.obs.addObserver(this, "document-element-inserted", false);
        break;
      case 'document-element-inserted':
        this.injectSwitcher(aSubject);
        break;
    }
  },

  injectSwitcher: function(aSubject) {
    let win = aSubject.defaultView;
    if (!win) {
      return;
    }

    let valid_host = 'about:accounts';
    let href = win.document.location.href;

    // Only accept "about:accounts" or "about:accoutns?"
    if (href.indexOf(valid_host) != 0) {
      return;
    }

    if (href.length != valid_host.length && href[valid_host.length] != '?') {
      return;
    }

    // Inject object.
    let mozCNFxaSwicherObj = {
      l10n: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: {
          _: function(key) {
            return _(key);
          },
          __exposedProps__: {
            _: 'r'
          }
        }
      },
      fxaSwitcher: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: {
          get localServiceEnabled() {
            return FxaSwitcher.localServiceEnabled;
          },
          resetFxaServices: function() {
            FxaSwitcher.resetFxaServices();
          },
          switchToLocalService: function() {
            FxaSwitcher.switchToLocalService();
          },
          __exposedProps__: {
            localServiceEnabled: 'r',
            resetFxaServices: 'r',
            switchToLocalService: 'r',
          }
        }
      }
    };

    let contentObj = Cu.createObjectIn(win);
    Object.defineProperties(contentObj, mozCNFxaSwicherObj);
    Cu.makeObjectPropsNormal(contentObj);

    win.wrappedJSObject.__defineGetter__("mozCNFxaSwicherObj", function() {
      delete win.wrappedJSObject.mozCNFxaSwicherObj;
      return win.wrappedJSObject.mozCNFxaSwicherObj = contentObj;
    });

    // Inject script
    let script = win.document.createElement('script');
    script.type = 'text/javascript;version=1.8';
    script.src = 'chrome://cmimprove/content/fxa/injectScript.js';
    win.document.documentElement.appendChild(script);
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([mozCNFxaSwitcher]);
