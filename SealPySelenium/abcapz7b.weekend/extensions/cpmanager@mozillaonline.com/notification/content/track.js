(function() {
  var ns = MOA.ns('AN.Tracker');

  var _trackurl = 'http://addons.g-fox.cn/notification.gif';

  ns.track = function(option) {
    option = MOA.AN.Lib.extend(option, {
      type: '',
      rid: '',
      action: ''
    });

    if (!option.type && !option.rid && !option.action)
      return;

    var url = _trackurl + '?r=' + Math.random()
            + '&c=' + 'notification'
            + '&t=' + encodeURIComponent(option.type)
            + '&d=' + encodeURIComponent(option.rid)
            + '&a=' + encodeURIComponent(option.action)
            + '&e=' + encodeURIComponent(option.extra)
            + '&cid=' + Application.prefs.getValue("app.chinaedition.channel","www.firefox.com.cn");
    var tracker = Components.classes["@mozilla.com.cn/tracking;1"];
    if (tracker) {
      tracker.getService().wrappedJSObject.send(url);
    }
  };
})();
