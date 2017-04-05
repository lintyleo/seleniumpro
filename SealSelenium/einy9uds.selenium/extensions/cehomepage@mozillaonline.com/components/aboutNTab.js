const { interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "NTabDB",
  "resource://ntab/NTabDB.jsm");

function AboutNTab() {}
AboutNTab.prototype = {
  classDescription: 'China Edition New Tab about:ntab',
  contractID: '@mozilla.org/network/protocol/about;1?what=ntab',
  classID: Components.ID('3ce0f801-b121-4a20-9188-3b92b13e9809'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

  getURIFlags: function(aURI) {
    return (Ci.nsIAboutModule.ALLOW_SCRIPT |
            Ci.nsIAboutModule.HIDE_FROM_ABOUTABOUT);
  },

  newChannel: function(aURI) {
    var channel = Services.io.newChannel(NTabDB.spec, null, null);
    channel.loadFlags = channel.loadFlags | channel.LOAD_REPLACE;
    channel.originalURI = aURI;
    return channel;
  }
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([AboutNTab]);
