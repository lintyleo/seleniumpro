var EXPORTED_SYMBOLS = ["cp_mod","cpmanager_FileUtil","cpmanager_LOG"];
var cpmanager_debug = false;
function cpmanager_LOG (msg) {
  if (cpmanager_debug) {
        try {
                var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
                consoleService.logStringMessage(msg);
        } catch(e) {}
  }
}


var cp_mod = {
  inited: false,
  antiCheating: true,
  firstTime: false,
  touched: false,
  startTime: false,
  winCount: 0,
};

var cpmanager_FileUtil = {
  chromeToPath: function(aPath) {
    cpmanager_LOG("cpmanager_mod: chromeToPath");
    if (!aPath || !(/^chrome:/.test(aPath))) {
      cpmanager_LOG("cpmanager_mod: chromeToPath: not a chrome path");
      return; //not a chrome url
    }
       var rv;

        var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces["nsIIOService"]);
          var uri = ios.newURI(aPath, "UTF-8", null);
          var cr = Components.classes['@mozilla.org/chrome/chrome-registry;1'].getService(Components.interfaces["nsIChromeRegistry"]);
          rv = cr.convertChromeURL(uri).spec;

          if (/^file:/.test(rv))
            rv = cpmanager_FileUtil.urlToPath(rv);
          else
            rv = cpmanager_FileUtil.urlToPath("file://"+rv);

        return rv;
  },

  urlToPath: function(aPath) {
      if (!aPath || !/^file:/.test(aPath))
        return ;
      var rv;
     var ph = Components.classes["@mozilla.org/network/protocol;1?name=file"]
          .createInstance(Components.interfaces.nsIFileProtocolHandler);
      rv = ph.getFileFromURLSpec(aPath).path;
      return rv;
  },

  copyFile: function(sourcefile, destdir) {
    // get a component for the file to copy
    var aFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    if (!aFile) return false;

    // get a component for the directory to copy to
    var aDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    if (!aDir) return false;

    // next, assign URLs to the file components
    aFile.initWithPath(sourcefile);
    aDir.initWithPath(destdir);

    // finally, copy the file, without renaming it
    aFile.copyTo(aDir, null);
  },

  removeFile: function(sourcefile) {
    var aFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    if (!aFile) return false;
    aFile.initWithPath(sourcefile);
    aFile.remove(true);
  },
};
