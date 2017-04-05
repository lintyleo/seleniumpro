/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  function _(key) {
    return mozCNFxaSwicherObj.l10n._(key);
  }

  function appendStyle() {
    let style = document.createElement('link');
    style.type = 'text/css';
    style.rel = 'stylesheet';
    style.href = 'chrome://cmimprove/content/fxa/injectStyle.css';

    document.getElementsByTagName('head')[0].appendChild(style);
  }

  function injectFxaFlag() {
    let flag = document.createElement('span');
    flag.id = 'cn-fxa-flag';
    if (mozCNFxaSwicherObj.fxaSwitcher.localServiceEnabled) {
      flag.textContent = _('fxa.page.flag.local');
      flag.title = _('fxa.page.tooltip.localServices');
    } else {
      flag.textContent = _('fxa.page.flag.global');
      flag.dataset.entry = 'global';
    }
    document.body.querySelector('#intro h1').appendChild(flag);
  }

  function injectFxaSwitchButton() {
    let div = document.createElement('div');
    div.id = 'cn-fxa-switcher';
    if (mozCNFxaSwicherObj.fxaSwitcher.localServiceEnabled) {
      div.innerHTML = '<a href="#">' + _('fxa.page.toggler.switchToGlobal') + '</a>';
    } else {
      div.innerHTML = '<a href="#">' + _('fxa.page.toggler.switchToLocal') + '</a>';
      div.title = _('fxa.page.tooltip.localServices');
    }
    div.onclick = toggleService;
    document.body.querySelector('#intro h1').appendChild(div);
  }

  function toggleService() {
    if (mozCNFxaSwicherObj.fxaSwitcher.localServiceEnabled) {
      mozCNFxaSwicherObj.fxaSwitcher.resetFxaServices();
    } else {
      mozCNFxaSwicherObj.fxaSwitcher.switchToLocalService();
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    appendStyle();
    injectFxaFlag();
    injectFxaSwitchButton();
  });
})();

