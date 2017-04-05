(function() {
  const { classes:Cc, interfaces:Ci, utils:Cu } = Components;

  var jsm = { };

  var appcenterEnabled = false;

  if (typeof XPCOMUtils == "undefined") {
    Cu.import("resource://gre/modules/XPCOMUtils.jsm");
  }

  function DragDropObserver() {
    // register drag gesture listeners
    this.dndListeners = [];

    // We want to know the "true" source of the drag, which we can no longer
    // reliably get from the drag session in Gecko 1.9.1
    this._sourceNode = null;

    this._startX = -1;
    this._startY = -1;
  }

  DragDropObserver.prototype = {
    addDragGestureListener: function(listener) {
      if (this.dndListeners.indexOf(listener) == -1) {
        this.dndListeners.push(listener);
      }
    },

    removeDragGestureListener: function(listener) {
      var idx = this.dndListeners.indexOf(listener);
      if (idx != -1) {
        this.dndListeners.splice(idx, 1);
      }
    },

    fireDragGestureEvent: function(event) {
      for (var i = 0; i < this.dndListeners.length; i += 1) {
        var listener = this.dndListeners[i];
        if ("onDragGesture" in listener && typeof listener.onDragGesture === 'function') {
          var ret = listener.onDragGesture(event);
          if (ret) {
            break;
          }
        }
      }

      this._startX = -1;
      this._startY = -1;
    },

    attachWindow: function(mainWindow) {
      var panelContainer = mainWindow.getBrowser().mPanelContainer;
      panelContainer.addEventListener("dragstart", this, false);
      panelContainer.addEventListener("dragover", this, false);
      panelContainer.addEventListener("drop", this, false);
    },

    detachWindow: function(mainWindow) {
      var panelContainer = mainWindow.getBrowser().mPanelContainer;
      panelContainer.removeEventListener("dragstart", this, false);
      panelContainer.removeEventListener("dragover", this, false);
      panelContainer.removeEventListener("drop", this, false);
    },

    get mainWindow() {
      var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                 .getService(Ci.nsIWindowMediator);
      var mainWindow = wm.getMostRecentWindow("navigator:browser");
      return (mainWindow);
    },

    handleEvent: function(event) {
      switch(event.type) {
        case "dragstart":
          this.dragstart(event);
          break;
        case "dragover":
          this.dragover(event);
          break;
        case "drop":
          this.dragdrop(event);
          break;
      }
    },

    /**
     * The Original Code is QuickDrag.
     * Version: MPL 1.1/GPL 2.0/LGPL 2.1
     *
     * The Initial Developer of the Original Code is Kai Liu.
     * Portions created by the Initial Developer are Copyright (C) 2008-2009
     * the Initial Developer. All Rights Reserved.
     *
     * Contributor(s):
     *   Kai Liu <kliu@code.kliu.org>
     *
     * Modified by Jia Mi
     * Need to move nsDragAndDrop to the mainWindow scope
     **/

    /**
     * For a variety of reasons, the nsDragAndDrop JS wrapper is not suitable
     * for this extension, but there are some pieces of nsDragAndDrop that are
     * useful; these parts have been wrapped inside _session, _getDragData,
     * and _securityCheck.
     **/

    // Wrapper for nsDragAndDrop.mDragSession
    get _session() {
      if (!this.mainWindow)
        return null;

      if (!this.mainWindow.nsDragAndDrop.mDragSession)
        this.mainWindow.nsDragAndDrop.mDragSession = this.mainWindow.nsDragAndDrop.mDragService.getCurrentSession();

      return (this.mainWindow.nsDragAndDrop.mDragSession);
    },

    // Wrapper for nsDragAndDrop.js's data retrieval; see nsDragAndDrop.drop
    _getDragData: function( aEvent ) {
      var data = "";
      var type = "text/unicode";

      if ("dataTransfer" in aEvent) {
        // Gecko 1.9.1 and newer: WHATWG drag-and-drop

        // Try to get text/x-moz-url, if possible
        var selection = this.mainWindow.content.window.getSelection();
        selection = selection ? selection.toString() : "";
        data = aEvent.dataTransfer.getData("text/x-moz-url");

        if (data.length != 0) {
          var lines = data.replace(/^\s+|\s+$/g, "").split(/\s*\n\s*/);
          if (lines.length > 1 && lines[1] === selection)  {
            type = "text/unicode";
            data = selection;
          } else {
            type = "text/x-moz-url";
          }
        } else {
          data = aEvent.dataTransfer.getData("text/plain");
        }
      } else if ("getDragData" in this.mainWindow.nsDragAndDrop) {
        // Gecko 1.9.0 and older: wrapper for nsDragAndDrop.getDragData

        var flavourSet = new this.mainWindow.FlavourSet();
        flavourSet.appendFlavour("text/x-moz-url");
        flavourSet.appendFlavour("text/unicode");

        var transferDataSet = this.mainWindow.nsTransferable.get(flavourSet, this.mainWindow.nsDragAndDrop.getDragData, true);

        data = transferDataSet.first.first.data;
        type = transferDataSet.first.first.flavour.contentType;
      }

      return({ data: data, type: type });
    },

    // Wrapper for nsDragAndDrop.dragDropSecurityCheck
    _securityCheck: function( aEvent, aDragSession, aDraggedText ) {
      if ("dragDropSecurityCheck" in this.mainWindow.nsDragAndDrop)
        this.mainWindow.nsDragAndDrop.dragDropSecurityCheck(aEvent, aDragSession, aDraggedText);
      else if ("dragDropSecurityCheck" in this.mainWindow.getBrowser())
        this.mainWindow.getBrowser().dragDropSecurityCheck(aEvent, aDragSession, aDraggedText);
    },

    // Determine if two DOM nodes are from the same content area.
    _fromSameContentArea: function( node1, node2 ) {
      return(
        node1 && node1.ownerDocument && node1.ownerDocument.defaultView &&
        node2 && node2.ownerDocument && node2.ownerDocument.defaultView &&
        node1.ownerDocument.defaultView.top.document == node2.ownerDocument.defaultView.top.document
      );
    },

    // Is this an event that we want to handle?
    _shouldHandleEvent: function( evt ) {
      return(
        ( this._session.isDataFlavorSupported("text/unicode") ||
          this._session.isDataFlavorSupported("text/plain") ) &&
        ( this._session.sourceNode == null ||
          this._fromSameContentArea(this._session.sourceNode, evt.target) )
      );
    },

    /**
     * Event handlers
     **/

    dragstart: function( evt ) {
      this._sourceNode = evt.explicitOriginalTarget;
      this._startX = evt.pageX;
      this._startY = evt.pageY;
    },

    dragover: function( evt ) {
      if (!this._shouldHandleEvent(evt)) return;
      this._session.canDrop = true;
    },

    dragdrop: function( evt ) {
      if (!this._shouldHandleEvent(evt)) return;

      // Get the source node and name
      var sourceNode = this._session.sourceNode;

      if (this._sourceNode) {
        sourceNode = this._sourceNode;
        this._sourceNode = null;
      }

      var sourceName = (sourceNode) ? sourceNode.nodeName : "";

      // Flags
      var isURI = false;
      var isImage = false;
      var isAnchorLink = false;

      // Parse the drag data
      var dragData = this._getDragData(evt);
      var lines = dragData.data.replace(/^\s+|\s+$/g, "").split(/\s*\n\s*/);
      var str = lines.join(" ");

      if (dragData.type == "text/x-moz-url") {
        // The user has dragged either a link or an image

        // By default, we want to use the URI (the first line)
        str = lines[0];
        isURI = true;

        if (sourceName == "IMG") {
          // Image or image link
          isImage = true;

          // If the URI does not match the source node, then this is a
          // linked image (note that we DO want to treat images linked to
          // themselves as if they are not linked at all)
          if (sourceNode.src != str)
            isAnchorLink = true;
        } else if (sourceName == "#text") {
          // Text link
          isAnchorLink = true;
        }
      }

      // Abort if we have no data; otherwise, proceed with URI detection
      if (!str) return;

      // Our heuristics; see bug 58 for info about the http fixup
      var hasScheme = /^(?:(?:h?tt|hxx)ps?|ftp|chrome|file):\/\//i;
      var hasIP = /(?:^|[\/@])(?:\d{1,3}\.){3}\d{1,3}(?:[:\/\?]|$)/;
      var hasDomain = new RegExp(
        // starting boundary
        "(?:^|[:\\/\\.@])" +
        // valid second-level name
        "[a-z0-9](?:[a-z0-9-]*[a-z0-9])" +
        // valid top-level name: ccTLDs + hard-coded [gs]TLDs
        "\\.(?:[a-z]{2}|aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel)" +
        // end boundary
        "(?:[:\\/\\?]|$)",
        // ignore case
        "i"
      );

      isURI = isURI || hasScheme.test(str);
      isURI = isURI || (!/\s/.test(str) && (hasIP.test(str) || hasDomain.test(str)));

      if (isURI) {
        // The scheme fixup here is more relaxed; patterns that match this
        // fixup but that failed the initial scheme heuristic are those
        // that match a valid domain or IP address pattern
        str = str.replace(/^(?:t?t|h[tx]{2,})p(s?:\/\/)/i, "http$1");

        // Call dragDropSecurityCheck
        this._securityCheck(evt, this._session, str);

        // Send the referrer only for embedded images or emulated
        // middle clicks over HTTP/HTTPS
        var referrer = null;
        if (sourceNode) {
          referrer = Cc["@mozilla.org/network/io-service;1"]
                       .getService(Ci.nsIIOService)
                       .newURI(sourceNode.ownerDocument.location.href, null, null);

          if (!(isImage && /^https?$/i.test(referrer.scheme)))
            referrer = null;
        }

        // Turn naked e-mail addresses into mailto: links
        if (/^[\w\.\+\-]+@[\w\.\-]+\.[\w\-]{2,}$/.test(str))
          str = "mailto:" + str;

        // For image links, the we want to use the source URL unless we
        // are going to treat the image as a link
        var dropEvent = {};
        dropEvent.type = "link";

        if (isImage) {
          str = sourceNode.src;
          dropEvent.type = "image";
        }

        dropEvent.data = str;
        dropEvent.startX = this._startX;
        dropEvent.startY = this._startY;
        dropEvent.endX = evt.pageX;
        dropEvent.endY = evt.pageY;

        // Link + Image
        this.fireDragGestureEvent(dropEvent);
      } else {
        // Text
        this.fireDragGestureEvent({
          type: 'text',
          data: str,
          startX: this._startX,
          startY: this._startY,
          endX: evt.pageX,
          endY: evt.pageY
        });
      }

      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  var dndHandler = {
    debug: function(msg) {
      dump('dnd handler: ' + msg + '\n');
    },

    dndObserver: null,

    get enabled() {
      var enabled = true;
      try {
        enabled = Services.prefs.getBoolPref(this.prefKey);
      } catch(e) {}

      return !appcenterEnabled && enabled;
    },

    init: function() {
      if (this.enabled) {
        this.dndObserver = new DragDropObserver();
        this.dndObserver.attachWindow(window);
        this.dndObserver.addDragGestureListener(this);
      }
    },

    unload: function() {
      if (this.dndObserver) {
        this.dndObserver.removeDragGestureListener(this);
        this.dndObserver.detachWindow(window);
        this.dndObserver = null;
      }
    },

    get mainWindow() {
      var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                 .getService(Ci.nsIWindowMediator);
      var mainWindow = wm.getMostRecentWindow("navigator:browser");
      return (mainWindow);
    },

    doSearchEngine: function(text, loadInBackground) {
      var searchService = Cc["@mozilla.org/browser/search-service;1"]
                            .getService(Ci.nsIBrowserSearchService);
      var engine = searchService.currentEngine;
      if (engine === null)
        return;

      var link = engine.getSubmission(text, null).uri.spec;
      this.openLink(link, loadInBackground);
    },

    openLink: function(link, loadInBackground) {
      this.mainWindow.getBrowser().loadOneTab(link, {
        inBackground: loadInBackground,
        allowThirdPartyFixup: false,
        relatedToCurrent: true
      });
    },

    onDragGesture: function(event) {
      var deltaX = event.endX - event.startX;
      var deltaY = event.endY - event.startY;

      if (deltaX * deltaX + deltaY * deltaY <= 25) {
        // not drag long enough I think
        return false;
      }

      if (event.type === 'text') {
        this.doSearchEngine(event.data, true);
        return true;
      } else if (event.type === 'link') {
        this.openLink(event.data, true);
        return true;
      } else if (event.type === 'image') {
        this.openLink(event.data, true);
      }

      return false;
    },

    prefKey: 'extensions.cmimprove.gesture.enabled',

    _observer: {
      QueryInterface: function(aIID) {
        if (aIID.equals(Ci.nsIObserver) ||
            aIID.equals(Ci.nsISupports) ||
            aIID.equals(Ci.nsISupportsWeakReference)) {
            return this;
        }
        throw Cr.NS_NOINTERFACE;
      },

      observe: function(aSubject, aTopic, aData) {
        if (aTopic == 'nsPref:changed') {
          switch (aData) {
            case dndHandler.prefKey:
              if (dndHandler.enabled) {
                dndHandler.init();
              } else {
                dndHandler.unload();
              }
              break;
          }
        }
      }
    },

    addObserver: function() {
      Services.prefs.addObserver(this.prefKey, this._observer, true);
    }
  };

  function registerDndHandler() {
    dndHandler.init();
    dndHandler.addObserver();

    window.addEventListener("unload", function dnd_onunload() {
      window.removeEventListener("unload", dnd_onunload, false);
      dndHandler.unload();
    }, false);
  }

  window.addEventListener("load", function dnd_onload() {
    window.removeEventListener("load", dnd_onload, false);

    window.setTimeout(function() {
      Cu.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID("livemargins@mozillaonline.com", function(addon) {
        if (addon && !addon.userDisabled && !addon.appDisabled &&
            Services.vc.compare(addon.version, '5.2') < 0) {
          appcenterEnabled = true;
        }
        registerDndHandler();
      });
    }, 1000);
  }, false);
})();
