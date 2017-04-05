(function() {
  let prefKey = 'engine.mozcn.ntab';
  let strings = Components.classes["@mozilla.org/intl/stringbundle;1"].
    getService(Components.interfaces.nsIStringBundleService).
    createBundle('chrome://ntab/locale/sync.properties');

  let onLoad = function() {
    window.removeEventListener('load', onLoad);

    let preference = document.getElementById(prefKey);
    let selector = 'checkbox[preference="engine.tabs"]';
    let checkTabs = document.querySelector(selector);
    if (!preference || !checkTabs) {
      return;
    }

    let checkbox = document.createElement('checkbox');

    let label = strings.GetStringFromName(prefKey + '.label');
    let accesskey = strings.GetStringFromName(prefKey + '.accesskey');

    checkbox.setAttribute('label', label);
    checkbox.setAttribute('accesskey', accesskey);
    checkbox.setAttribute('preference', prefKey);
    preference.setElementValue(checkbox);

    checkTabs.parentNode.appendChild(checkbox);
  };

  window.addEventListener('load', onLoad, false);
})();
