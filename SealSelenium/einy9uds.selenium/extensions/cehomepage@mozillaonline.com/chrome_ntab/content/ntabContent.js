let Cu = Components.utils;
let Ci = Components.interfaces;
let Cc = Components.classes;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  'resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyModuleGetter(this, "NTabDB",
  "resource://ntab/NTabDB.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "NTabSync",
  "resource://ntab/NTabSync.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Tracking",
  "resource://ntab/Tracking.jsm");

let NTab = {
  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case 'content-document-global-created':
        if (!content || !aSubject || aSubject !== content) {
          return;
        }

        let docURI = aSubject.document.documentURIObject;

        if (docURI.prePath !== NTabDB.prePath) {
          return;
        }
        this.initTracking(aSubject);

        if (!docURI.equals(NTabDB.uri)) {
          return;
        }
        this.init(aSubject);
        break;
    }
  },
  initTracking: function(aSubject) {
    aSubject.addEventListener('mozCNUtils:Tracking', function(aEvt) {
      Tracking.track(aEvt.detail);
    }, true, true);
  },
  init: function(aSubject) {
    let document = aSubject.document;

    let Launcher = {
      get launcher() {
        delete this.launcher;
        return this.launcher = document.querySelector('#launcher');
      },
      get tools() {
        delete this.tools;
        return this.tools = document.querySelector('li[data-menu="tools"]');
      },
      init: function Launcher_init() {
        if (!this.tools) {
          return;
        }

        this.tools.removeAttribute('hidden');

        let self = this;
        [].forEach.call(document.querySelectorAll('#tools > li'), function(li) {
          li.addEventListener('click', function(aEvt) {
            self.launcher.classList.toggle('tools');

            sendAsyncMessage('mozCNUtils:Tools', aEvt.currentTarget.id);

            Tracking.track({
              type: 'tools',
              action: 'click',
              sid: aEvt.currentTarget.id
            });
          }, false, /** wantsUntrusted */false);
        });
      }
    };

    let FxAccounts = {
      _inited: false,
      _cachedMessages: [],

      messageName: 'mozCNUtils:FxAccounts',
      attributes: [
        "disabled",
        "failed",
        "fxastatus",
        "hidden",
        "label",
        "signedin",
        "status",
        "tooltiptext"
      ],

      get button() {
        delete this.button;
        return this.button = document.querySelector('#fx-accounts');
      },

      receiveMessage: function(aMessage) {
        if (aMessage.name != this.messageName) {
          return;
        }

        if (!this._inited) {
          this._cachedMessages.push(aMessage);
          return;
        }

        switch(aMessage.data) {
          case "init":
          case "mutation":
            this.updateFromKV(aMessage.objects, aMessage.data);
            break;
        }
      },

      init: function() {
        this._inited = true;

        sendAsyncMessage(this.messageName, 'init');

        while (this._cachedMessages.length) {
          this.receiveMessage(this._cachedMessages.shift());
        }
      },

      updateAttribute: function(aKV, aAttributeName) {
        if (aKV[aAttributeName]) {
          let attributeVal = aKV[aAttributeName];
          switch (aAttributeName) {
            case "label":
              this.button.textContent = attributeVal;
              break;
            case "tooltiptext":
              this.button.setAttribute("title", attributeVal);
              break;
            default:
              this.button.setAttribute(aAttributeName, attributeVal);
              break;
          }
        } else {
          switch (aAttributeName) {
            case "label":
              this.button.textContent = "";
              break;
            case "tooltiptext":
              this.button.removeAttribute("title");
              break;
            default:
              this.button.removeAttribute(aAttributeName);
              break;
          }
        }
      },
      updateFromKV: function(aKV, aType) {
        if (!this.button) {
          return;
        }

        if (aType == 'init') {
          let self = this;
          this.button.addEventListener('click', function(aEvt) {
            let fxaStatus = aEvt.originalTarget.getAttribute("fxastatus");
            sendAsyncMessage(self.messageName, 'action', {
              originalTarget: {
                getAttribute: function(aAttribute) {
                  switch(aAttribute) {
                    case "fxastatus":
                      return fxaStatus;
                    default:
                      return;
                  }
                }
              }
            });

            Tracking.track({
              type: 'ntabsync',
              action: 'click',
              sid: 'in-content'
            });
          }, false, /** wantsUntrusted */false);
        }

        for (let i = 0, l = this.attributes.length; i < l; i++) {
          this.updateAttribute(aKV, this.attributes[i]);
        }
      }
    };

    aSubject.addEventListener('mozCNUtils:Diagnose', function(aEvt) {
      switch(aEvt.detail) {
        case 'UnknownError':
          NTabDB.fixUnknownError('content');
          break;
      }
    }, true, true);

    aSubject.addEventListener(NTabSync.messageName, function(aEvt) {
      if (aEvt.detail && aEvt.detail.dir == 'content2fs') {
        sendAsyncMessage(NTabSync.messageName, aEvt.detail.data);
      }
    }, true, true);

    let relaySyncMessage = function(aEvt) {
      if (aEvt.data) {
        aSubject.dispatchEvent(new aSubject.CustomEvent(NTabSync.messageName, {
          detail: Cu.cloneInto({
            dir: 'fs2content',
            data: {
              id: aEvt.data.id,
              type: aEvt.data.type,
              state: aEvt.data.state
            }
          }, aSubject)
        }));
      }
    };

    addMessageListener(NTabSync.messageName, relaySyncMessage);
    addMessageListener(FxAccounts.messageName, FxAccounts);

    aSubject.addEventListener('DOMContentLoaded', function() {
      Launcher.init();
      FxAccounts.init();
    }, false);
    aSubject.addEventListener('unload', function() {
      removeMessageListener(NTabSync.messageName, relaySyncMessage);
      removeMessageListener(FxAccounts.messageName, FxAccounts);
    }, false);
  }
}

Services.obs.addObserver(NTab, 'content-document-global-created', false);
