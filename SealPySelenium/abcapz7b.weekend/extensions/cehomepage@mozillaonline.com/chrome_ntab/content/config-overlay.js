(function() {
  let onLoad = function() {
    window.removeEventListener('load', onLoad);

    // browser.newtab.url removed in https://bugzil.la/1118285
    if (Services.vc.compare(Services.appinfo.version, "41.0") >= 0) {
      return;
    }

    let jsm = {};
    Components.utils.import('resource://ntab/NTabDB.jsm', jsm);

    let newtabPrefKey = "browser.newtab.url";
    let newtabPrefVal = jsm.NTabDB.getAltSpec() || jsm.NTabDB.spec;

    let origModifySelected = window.ModifySelected;
    window.ModifySelected = function() {
      let prefKey;
      if (view.selection.currentIndex >= 0) {
        let entry = gPrefView[view.selection.currentIndex];
        prefKey = entry.prefCol;
      }

      let ret = origModifySelected();

      if (!prefKey || prefKey !== newtabPrefKey ||
          gPrefBranch.getCharPref(newtabPrefKey) === newtabPrefVal) {
        return ret;
      }
      gPrefBranch.setBoolPref("moa.ntab.openInNewTab", false);
      return ret;
    };

    let origResetSelected = window.ResetSelected;
    window.ResetSelected = function() {
      let prefKey = gPrefView[view.selection.currentIndex].prefCol;
      if (prefKey === newtabPrefKey) {
        gPrefBranch.setBoolPref("moa.ntab.openInNewTab", false);
      }

      return origResetSelected();
    };
  };

  window.addEventListener('load', onLoad, false);
})();
