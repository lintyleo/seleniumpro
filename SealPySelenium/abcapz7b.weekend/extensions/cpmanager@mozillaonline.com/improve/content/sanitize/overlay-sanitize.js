window.addEventListener('load', function() {
  if (Application.prefs.getValue("extensions.cmimprove.features.sanitize.show", false))
    return;
  Application.prefs.setValue("extensions.cmimprove.features.sanitize.show", true);
  setTimeout(() => {
    gSanitizePromptDialog.showItemList();
  }, 100);
}, false)
