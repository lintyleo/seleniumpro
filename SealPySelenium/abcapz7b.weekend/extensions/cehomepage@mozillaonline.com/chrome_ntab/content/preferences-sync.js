var mozCNNTabSync = (function() {
  // this cannot be done with an overlay, sigh
  let qs = document.querySelector.bind(document);
  let paneSync = qs('#paneSync');

  let onPaneLoad = function(aEvt) {
    aEvt.target.removeEventListener(aEvt.type, onPaneLoad);
    let parentVBox = qs("#fxaSyncEngines > vbox");
    let checkbox = qs('checkbox[preference="engine.mozcn.ntab"]');
    if (!parentVBox || !checkbox) {
      return;
    }

    parentVBox.appendChild(checkbox.cloneNode());
  };

  if (paneSync) {
    paneSync.addEventListener('paneload', onPaneLoad, false);
  } else {
    window.addEventListener('DOMContentLoaded', onPaneLoad, false);
  }

  // prompt for confirmation for every false => true change
  let url = "chrome://ntab/locale/sync.properties";
  let bundle = Services.strings.createBundle(url);
  let prefix = "ntabsync.notification.";
  let message = bundle.GetStringFromName(prefix + "message");
  let title = bundle.GetStringFromName(prefix + "title");

  let onSyncToEnablePref = function(aCheckbox) {
    if (!aCheckbox.checked) {
      if (window.mozCNSyncHack && mozCNSyncHack.onSyncToEnablePref) {
        return mozCNSyncHack.onSyncToEnablePref(aCheckbox);
      } else {
        return undefined;
      }
    }
    let shouldEnable = Services.prompt.confirm(window, title, message);

    if (!shouldEnable) {
      aCheckbox.checked = false;
    }
  };

  return { onSyncToEnablePref: onSyncToEnablePref };
})();
