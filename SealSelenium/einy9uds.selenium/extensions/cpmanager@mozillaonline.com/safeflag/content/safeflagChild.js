/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let { classes: Cc, interfaces: Ci, results: Cr, utils: Cu }  = Components;

let DEBUG = 0;
function log(msg) {
  if (DEBUG) Cu.reportError('###### safeflagChild: ' + msg + '\n');
}

log('script loaded.');

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, 'safeflag',
  "resource://cmsafeflag/safeflag.jsm");

XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  "resource://gre/modules/Services.jsm");

let classifyResult = null;

function updateClassifyResult(aIsMalware, aIsPhishing, aIsUnwanted) {
  classifyResult = {
    isMalware: aIsMalware,
    isPhishing: aIsPhishing,
    isUnwanted: aIsUnwanted
  };

  log('Set classify result to: ' + JSON.stringify(classifyResult));
  sendClassifyResultToParent();
}

function sendClassifyResultToParent() {
  sendAsyncMessage('SafeFlag::updateClassifyResult', classifyResult);
}

function classifyDocument(aDocument) {
  let docURI = aDocument.documentURI;
  if (docURI.indexOf('about:blocked') == 0) {
    updateClassifyResult(
      /* aIsMalware  =*/ docURI.indexOf('malwareBlocked') > 0,
      /* aIsPhishing =*/ docURI.indexOf('phishingBlocked') > 0,
      /* aIsUnwanted =*/ docURI.indexOf('unwantedBlocked') > 0);
  } else {
    let uri = aDocument.location.href;
    if (uri.indexOf('about:') == 0 ||
        uri.indexOf('http://offlintab.firefoxchina.cn') == 0) {
      log("Empty classify result for uri: " + uri);
      // Set result null to indicate that we don't need to show any safe flag.
      classifyResult = null;
      sendClassifyResultToParent();
    } else {
      // We don't know if this document is passed or just bypassed the
      // internal classifier, wee need to double check it.
      safeflag.lookup_some(uri, (aResult) => {
        log("We double checked safe flag for uri: " + uri);
        updateClassifyResult(aResult.isMalware, aResult.isPhishing, aResult.isUnwanted);
      });
    }
  }
}

addMessageListener('SafeFlag::updateClassifyResult', sendClassifyResultToParent);

addEventListener("DOMContentLoaded", (aEvent) => {
  log("DOMContentLoaded: " + aEvent.originalTarget.location + ', ' + aEvent.originalTarget.documentURI);

  let win = aEvent.originalTarget.defaultView;
  if (win != win.top) return;

  if (Services.prefs.getBoolPref('extensions.safeflag.enable')) {
    classifyDocument(aEvent.originalTarget);
  }
});

// If the pref is enabled by user, we need to reclassify the
// content to make sure the icon appeareance is refreshed.
addMessageListener('SafeFlag::enabledChanged', (aEvent) => {
  if (Services.prefs.getBoolPref('extensions.safeflag.enable')) {
    classifyDocument(content.document);
  }
});

// FIXME check if the page is loaded?
// Check current loaded doc, usually works for the tabs loaded after FF restarted.
if (Services.prefs.getBoolPref('extensions.safeflag.enable')) {
  classifyDocument(content.document);
}

