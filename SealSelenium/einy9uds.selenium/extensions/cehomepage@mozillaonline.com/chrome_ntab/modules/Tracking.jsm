var EXPORTED_SYMBOLS = ['Tracking'];

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");

let url = 'http://addons.g-fox.cn/ntab.gif';
let _extend = function (src, target) {
  for (var key in src) {
    target[key] = src[key];
  }
  return target;
}

let Tracking = {
  get cid() {
    let cid = 'www.firefox.com.cn';
    try {
      cid = Services.prefs.getCharPref('app.chinaedition.channel')
    } catch(e) {};

    delete this.cid;
    return this.cid = cid;
  },

  track: function(option) {
    let tracker = Cc["@mozilla.com.cn/tracking;1"];
    if (!tracker || !tracker.getService().wrappedJSObject.ude) {
      return;
    }

    option = _extend(option, {
      type: '',
      action: '',
      fid: '',
      sid: '',
      href: '',
      title: '',
      altBase: ''
    });

    let args = [];

    // alternative format used by newtab.firefoxchina.cn
    if (option.altBase == 'http://newtab.firefoxchina.cn/img/trace.gif') {
      if (!option.sid || !option.title || !option.href) {
        return;
      }

      args.push('c=' + encodeURIComponent(option.sid));
      args.push('t=' + encodeURIComponent(option.title));
      args.push('u=' + encodeURIComponent(option.href));
    } else {
      if (!option.type || !option.sid || !option.action) {
        return;
      }

      args.push('c=ntab');
      args.push('t=' + encodeURIComponent(option.type));
      args.push('a=' + encodeURIComponent(option.action));
      args.push('d=' + encodeURIComponent(option.sid));
      args.push('f=' + encodeURIComponent(option.fid));
      if (option.title) {
        args.push('ti=' + encodeURIComponent(option.title).substr(0, 200));
      }
      if (option.href) {
        args.push('hr=' + encodeURIComponent(option.href).substr(0, 200));
      }
      args.push('r=' + Math.random());
    }

    args.push('cid=' + this.cid);

    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
                createInstance(Ci.nsIXMLHttpRequest);
    xhr.open('GET', ((option.altBase || url) + '?' + args.join('&')), true);
    xhr.send();
  }
};
