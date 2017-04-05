/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var mozCNSyncHack = (function() {
  const Cu = Components.utils;
  const Cr = Components.results;
  const Ci = Components.interfaces;
  const Cc = Components.classes;

  Cu.import("resource://gre/modules/XPCOMUtils.jsm");

  XPCOMUtils.defineLazyModuleGetter(this, "FxaSwitcher",
    "chrome://cmimprove/content/fxa/serviceSwitcher.jsm");

  XPCOMUtils.defineLazyModuleGetter(this, "Services",
    "resource://gre/modules/Services.jsm");

  let _bundles = null;
  function _(key, args) {
    if (!_bundles) {
      _bundles = Services.strings.createBundle("chrome://cmimprove/locale/fxa.properties");
    }

    key = "fxa.preferences." + key;
    return args ?
      _bundles.formatStringFromName(key, args, args.length) :
      _bundles.GetStringFromName(key);
  }

  function toggle() {
    if (FxaSwitcher.localServiceEnabled) {
      FxaSwitcher.resetFxaServices();
    } else {
      FxaSwitcher.switchToLocalService();
    }
  }

  function updateUI() {
    let toggler = document.getElementById('cn-fxa-switcher');
    toggler.value =
      FxaSwitcher.localServiceEnabled ?
        _('label.switchToGlobal') :
        _('label.switchToLocal');

    if (FxaSwitcher.localServiceEnabled) {
      let caption = document.querySelector('#fxaGroup > caption:first-child');
      let captionLabel = caption.querySelector('label');
      let captionLabelText = _('caption.label');
      if (captionLabel) {
        captionLabel.textContent = captionLabelText;
      } else {
        caption.label = captionLabelText;
      }
    }

    // We only change the color of the label that open old sync support page. However, there is
    // no id in this label, let's use an ugly hack to indentify it here ...
    [].forEach.call(document.querySelectorAll('#noFxaAccount label.text-link'), aLabel => {
      if (aLabel.getAttribute('onclick').contains('openOldSyncSupportPage()')) {
        aLabel.style.color = '#999';
      }
    });

    let observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        let altHref = mutation.target.getAttribute('delayed-mozcn-href');
        if (!altHref ||
            mutation.type != 'attributes' ||
            mutation.attributeName != 'href' ||
            mutation.target.getAttribute(mutation.attributeName) == altHref) {
          return;
        }

        mutation.target.setAttribute(mutation.attributeName, altHref);
        mutation.target.removeAttribute('delayed-mozcn-href');
        let selector = '[delayed-mozcn-href^="http://www.firefox.com.cn/#"]';
        if (!document.querySelectorAll(selector).length) {
          observer.disconnect();
        }
      });
    });
    let observerConfig = {
      attributes: true,
      attributeFilter: ['href']
    };
    [].forEach.call(document.querySelectorAll('label.androidLink.text-link'), aLabel => {
      if (aLabel.getAttribute('href')) {
        aLabel.setAttribute('href', 'http://www.firefox.com.cn/#android');
      } else {
        aLabel.setAttribute('delayed-mozcn-href', 'http://www.firefox.com.cn/#android');
        observer.observe(aLabel, observerConfig);
      }
    });
    [].forEach.call(document.querySelectorAll('label.iOSLink.text-link'), aLabel => {
      if (aLabel.getAttribute('href')) {
        aLabel.setAttribute('href', 'http://www.firefox.com.cn/#ios');
      } else {
        aLabel.setAttribute('delayed-mozcn-href', 'http://www.firefox.com.cn/#ios');
        observer.observe(aLabel, observerConfig);
      }
    });

    let selector = 'checkbox[preference^="engine."]';
    [].filter.call(document.querySelectorAll(selector), checkbox => {
      return document.getElementById(checkbox.getAttribute("preference")).
        name.startsWith("services.sync.engine.");
    }).forEach(checkbox => {
      if (checkbox.hasAttribute("onsynctopreference")) {
        return;
      }

      checkbox.setAttribute("onsynctopreference",
        "return mozCNSyncHack.onSyncToEnablePref(this);");
    });
  }

  let paneSync = document.getElementById('paneSync');
  let onLoad = function() {
    let toggler = document.getElementById('cn-fxa-switcher');
    toggler.onclick = toggle;
    updateUI();
  }
  if (paneSync) {
    paneSync.addEventListener('paneload', onLoad);
  } else {
    window.addEventListener('DOMContentLoaded', onLoad);
  }

  let onSyncToEnablePref = function(checkbox) {
    if (checkbox.checked) {
      return undefined;
    }

    let p = Services.prompt;
    let shouldDisable = p.confirmEx(window,
      _('warning.title', [checkbox.label]),
      _('warning.message', [checkbox.label]),
      p.STD_YES_NO_BUTTONS + p.BUTTON_POS_1_DEFAULT + p.BUTTON_DELAY_ENABLE,
      '', '', '', null, {}) === 0;

    if (!shouldDisable) {
      checkbox.checked = true;
    }
  };

  return { onSyncToEnablePref: onSyncToEnablePref };
})();
