const { interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

function AboutCEhome() {}
AboutCEhome.prototype = {
  classDescription: 'China Edition New Home about:cehome',
  contractID: '@mozilla.org/network/protocol/about;1?what=cehome',
  classID: Components.ID('c0a76f7d-8214-4476-afe3-b34f9051cb99'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

  getURIFlags: function(aURI) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  },

  newChannel: function(aURI) {
    var home = 'chrome://cehomepage/content/aboutHome.xul';
    var channel = Services.io.newChannel(home, null, null);
    channel.originalURI = aURI;
    return channel;
  }
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([AboutCEhome]);
