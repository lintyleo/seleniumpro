/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  Cu.import('resource://gre/modules/LoadContextInfo.jsm');

  let kFileMime = "application/x-moz-file";
  let kHTMLMime = "text/html";
  let kHTMLInfo = "text/_moz_htmlinfo";
  let kHTMLContext = "text/_moz_htmlcontext";
  let kNativeImageMime = "application/x-moz-nativeimage";

  function init() {
    let imgNode, tempFile;
    let privacyContext = PrivateBrowsingUtils.
      privacyContextFromWindow(window, false);
    let originGoDoCommand = goDoCommand;

    // nsContentUtils::GetImageFromContent
    let imageFromContent = function(content) {
      try {
        let imgRequest = content.getRequest(Ci.nsIImageLoadingContent.CURRENT_REQUEST);
        if (!imgRequest) {
          return;
        }

        return imgRequest.image;
      } catch(e) {}

      return;
    };

    let appendString = function(xferable, string, flavor) {
      let data = Cc["@mozilla.org/supports-string;1"].
        createInstance(Ci.nsISupportsString);
      data.data = string;
      xferable.addDataFlavor(flavor);
      xferable.setTransferData(flavor, data, data.data.length * 2);
    };

    let appendDOMNode = function(xferable, node) {
      let docEncoder = Cc["@mozilla.org/layout/htmlCopyEncoder;1"].
        createInstance(Ci.nsIDocumentEncoder);
      let document = node.ownerDocument;
      let htmlDoc = document.QueryInterface(Ci.nsIDOMHTMLDocument);

      docEncoder.init(htmlDoc, kHTMLMime,
        Ci.nsIDocumentEncoder.OutputAbsoluteLinks |
        Ci.nsIDocumentEncoder.OutputEncodeW3CEntities);
      docEncoder.setNode(node);
      let context = {},
          info = {};
      let html = docEncoder.encodeToStringWithContext(context, info);
      if (html) {
        appendString(xferable, html, kHTMLMime);
      }
      if (info.value) {
        appendString(xferable, info.value, kHTMLInfo);
      }
      appendString(xferable, context.value, kHTMLContext);
    };

    // nsCopySupport::ImageCopy with nsIContentViewerEdit::COPY_IMAGE_DATA
    let setClipboard = function() {
      let xferable = Cc["@mozilla.org/widget/transferable;1"].
        createInstance(Ci.nsITransferable);
      if (xferable.init) {
        xferable.init(privacyContext);
      }

      try {
        // x-moz-file needs to come before x-moz-nativeimage, not sure why
        xferable.addDataFlavor(kFileMime);
        xferable.setTransferData(kFileMime, tempFile, 0);

        let node = imgNode.QueryInterface(Ci.nsIDOMNode);
        appendDOMNode(xferable, node);

        let image = imageFromContent(imgNode);
        let imgPtr = Cc["@mozilla.org/supports-interface-pointer;1"].
          createInstance(Ci.nsISupportsInterfacePointer);
        imgPtr.data = image;

        xferable.addDataFlavor(kNativeImageMime);
        xferable.setTransferData(kNativeImageMime, imgPtr, -1);

        let clipboard = Services.clipboard;
        if (clipboard.supportsSelectionClipboard()) {
          clipboard.emptyClipboard(clipboard.kSelectionClipboard);
          clipboard.setData(xferable, null, clipboard.kSelectionClipboard);
        }
        clipboard.emptyClipboard(clipboard.kGlobalClipboard);
        clipboard.setData(xferable, null, clipboard.kGlobalClipboard);
      } catch (e) {
        Cu.reportError(e);
      }
    };

    let maybeSetClipboard = function() {
      if (!tempFile || !tempFile.exists()) return;

      OS.File.read(tempFile.path, 3).then(function(arr) {
        // File first 3 bytes are "GIF"
        if (arr[0] == 71 && arr[1] == 73 && arr[2] == 70) {
          setClipboard();
        }
      }, function() {
        console.log('read file failed!');
      })
    };

    goDoCommand = function(cmd) {
      originGoDoCommand(cmd);

      if (cmd != 'cmd_copyImage') {
        return;
      }

      imgNode = gContextMenu.target;
      tempFile = null;

      let cacheService = Cc['@mozilla.org/netwerk/cache-storage-service;1'].
        getService(Ci.nsICacheStorageService);
      let storage = cacheService.diskCacheStorage(
        LoadContextInfo.fromLoadContext(privacyContext), false);
      let uri = gContextMenu.target.currentURI;

      if (uri instanceof Ci.nsIFileURL) {
        try {
          tempFile = uri.file;
          maybeSetClipboard();
        } catch(e) {
          console.log(e);
        }
        return;
      }

      storage.asyncOpenURI(uri, '', Ci.nsICacheStorage.OPEN_NORMALLY, {
        onCacheEntryCheck: function (entry, appcache) {
          return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
        },
        onCacheEntryAvailable: function (entry, isnew, appcache, status) {
          if (status) return;
          let inputStream = entry.openInputStream(0);
          let fileName = Date.now() + '.gif';
          tempFile = FileUtils.getFile('TmpD', [fileName]);
          if (tempFile.exists()) {
            console.log('file exist');
            tempFile.remove(true);
          }
          tempFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
          let outputStream = FileUtils.openSafeFileOutputStream(tempFile);
          NetUtil.asyncCopy(inputStream, outputStream, maybeSetClipboard);
        }
      });
    };
  }

  window.addEventListener('load', function wnd_onload(e) {
    window.removeEventListener('load', wnd_onload);
    window.setTimeout(() => {
      init();
    }, 1000);
  });
})();
