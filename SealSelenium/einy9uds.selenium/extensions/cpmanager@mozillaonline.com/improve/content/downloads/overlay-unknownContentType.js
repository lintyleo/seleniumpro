var SDI = null;
(function() {
SDI = {
  handleEvent: function SDI__handleEvent(aEvent) {
    switch (aEvent.type) {
      case "load":
        this.tracking();
        this.init();
        break;
    }
  },

  tracking: function SDI__tracking() {
    try {
      var ceTracking = Cc["@mozilla.com.cn/tracking;1"].
                         getService().wrappedJSObject;
      ceTracking.track("unknownContentType-load");
    } catch(e) {}
  },

  init: function SDI__init() {
    // show basic choice
    if (document.getElementById("normalBox").collapsed == true) {
      document.getElementById("basicBox").collapsed = true;
      document.getElementById("normalBox").collapsed = false;
      document.getElementById("open").disabled = true;
      var openHandler = document.getElementById("openHandler");
      openHandler.disabled = true;
      openHandler.selectedItem = null;
      var rememberChoice = document.getElementById("rememberChoice");
      rememberChoice.checked = false;
      rememberChoice.disabled = true;

      window.sizeToContent()
    }
    this.folderListPref = Application.prefs.getValue("browser.download.folderList", 1);
    this.currentDir = this._indexToFolder(this.folderListPref); // file
    this.displayDownloadDirPref();
    var _onOK = dialog.onOK.bind(dialog);
    dialog.onOK = (function() {
      SDI.savePrefs();
      _onOK();
    }).bind(dialog);
  },

  folderListPref: 0,
  currentDir: null,

  savePrefs: function () {
    Application.prefs.setValue("browser.download.folderList", this.folderListPref);
    Application.prefs.setValue("browser.download.dir", this.currentDir.path);
  },

  chooseFolder: function () {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    const nsILocalFile = Components.interfaces.nsILocalFile;

    let bundlePreferences = document.getElementById("bundlePreferences");
    let title = bundlePreferences.getString("chooseDownloadFolderTitle");
    let defDownloads = this._indexToFolder(1); // file
    let fp = Components.classes["@mozilla.org/filepicker;1"].
             createInstance(nsIFilePicker);
    let fpCallback = function fpCallback_done(aResult) {
      if (aResult == nsIFilePicker.returnOK) {
        let file = fp.file.QueryInterface(nsILocalFile);
        this.folderListPref = this._folderToIndex(file);
        this.currentDir = file;
        this.displayDownloadDirPref();
        document.getElementById("mode").selectedItem = document.getElementById("save");
      }
    }.bind(this);

    fp.init(window, title, nsIFilePicker.modeGetFolder);
    fp.appendFilters(nsIFilePicker.filterAll);
    // First try to open what's currently configured
    if (this.currentDir && this.currentDir.exists()) {
      fp.displayDirectory = this.currentDir;
    } // Try the system's download dir
    else if (defDownloads && defDownloads.exists()) {
      fp.displayDirectory = defDownloads;
    } // Fall back to Desktop
    else {
      fp.displayDirectory = this._indexToFolder(0);
    }
    fp.open(fpCallback);
  },

  _folderToIndex: function (aFolder)
  {
    if (!aFolder || aFolder.equals(this._getDownloadsFolder("Desktop")))
      return 0;
    else if (aFolder.equals(this._getDownloadsFolder("Downloads")))
      return 1;
    return 2;
  },

  _indexToFolder: function (aIndex)
  {
    switch (aIndex) {
      case 0:
        return this._getDownloadsFolder("Desktop");
      case 1:
        return this._getDownloadsFolder("Downloads");
    }

    var file = Cc['@mozilla.org/file/local;1']
               .createInstance(Ci.nsILocalFile);
    try {
      var cdPref = Application.prefs.getValue("browser.download.dir","");
      file.initWithPath(cdPref);
    } catch(e) {
      file = this._getDownloadsFolder("Downloads");
      this.folderListPref = 1;
    }
    return file;
  },

  _getDownloadsFolder: function (aFolder)
  {
    switch (aFolder) {
      case "Desktop":
        var fileLoc = Components.classes["@mozilla.org/file/directory_service;1"]
                                    .getService(Components.interfaces.nsIProperties);
        return fileLoc.get("Desk", Components.interfaces.nsILocalFile);
      break;
      case "Downloads":
        var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
                                .getService(Components.interfaces.nsIDownloadManager);
        return dnldMgr.defaultDownloadsDirectory;
      break;
    }
    throw "ASSERTION FAILED: folder type should be 'Desktop' or 'Downloads'";
  },

  displayDownloadDirPref: function () {
    var bundlePreferences = document.getElementById("bundlePreferences");
    var downloadFolder = document.getElementById("downloadFolder");

    // Used in defining the correct path to the folder icon.
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
    var fph = ios.getProtocolHandler("file")
                 .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
    var iconUrlSpec;

    // Display a 'pretty' label or the path in the UI.
    if (this.folderListPref == 2) {
      // Custom path selected and is configured
      downloadFolder.label = this._getDisplayNameOfFile(this.currentDir);
      iconUrlSpec = fph.getURLSpecFromFile(this.currentDir);
    } else if (this.folderListPref == 1) {
      // 'Downloads'
      // In 1.5, this pointed to a folder we created called 'My Downloads'
      // and was available as an option in the 1.5 drop down. On XP this
      // was in My Documents, on OSX it was in User Docs. In 2.0, we did
      // away with the drop down option, although the special label was
      // still supported for the folder if it existed. Because it was
      // not exposed it was rarely used.
      // With 3.0, a new desktop folder - 'Downloads' was introduced for
      // platforms and versions that don't support a default system downloads
      // folder. See nsDownloadManager for details.
      downloadFolder.label = bundlePreferences.getString("downloadsFolderName");
      iconUrlSpec = fph.getURLSpecFromFile(this._indexToFolder(1));
    } else if (this.folderListPref == 0) {
      // 'Desktop'
      downloadFolder.label = bundlePreferences.getString("desktopFolderName");
      iconUrlSpec = fph.getURLSpecFromFile(this._indexToFolder(0));
    }
    downloadFolder.image = "moz-icon://" + iconUrlSpec + "?size=16";

    // don't override the preference's value in UI
    return undefined;
  },

  _getDisplayNameOfFile: function (aFolder)
  {
    // TODO: would like to add support for 'Downloads on Macintosh HD'
    //       for OS X users.
    return aFolder ? aFolder.path : "";
  },
}
window.addEventListener('load' , SDI, false);
})();
