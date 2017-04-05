/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var ns = MOA.ns('SafeFlag.Layout')

  function safeGetElementById(id) {
    var element = window.document.getElementById(id);
    if (!element)
      throw Error("Element does not exist: " + id);
    return element;
  }

  function _getIconPath(filename) {
    return "chrome://cmsafeflag/content/icons/" + filename + ".png";
  }

  function _isActivated() {
    var uri = MOA.SafeFlag.Utils.getCurrentURI();
    try {
      if (!uri || !uri.host)
        return false;
    } catch (e) {
      return false;
    }

    return true;
  }

  // remenber default className of urlbar to switch its background color
  var default_className = null;
  var current_tab_safeflag = null;

  function _updateIcon() {
    var urlbar = document.getElementById('urlbar');
    if (null == default_className) {
      default_className = urlbar.className;
    }
    urlbar.className = default_className;
    var icon = document.getElementById("safeflag-icon");
    icon.hidden = true;
    icon.tooltipText = MOA.SafeFlag.Utils.getString('tooltipSafeFlag');

    if (!_isActivated())
      return;

    if (!current_tab_safeflag)
      return;

    icon.tooltipText = '';
    var isSafeBackground = MOA.SafeFlag.Utils.getPrefs().getBoolPref("background.safe");
    var isUnsafeBackground = MOA.SafeFlag.Utils.getPrefs().getBoolPref("background.unsafe");

    if (current_tab_safeflag.isMalware || current_tab_safeflag.isPhishing || current_tab_safeflag.isUnwanted) {
      icon.classList.add('safeflag-unsafe');
      if (isUnsafeBackground) {
        MOA.debug('Set background color for unsafe sites.');
        urlbar.classList.remove('sfbg_safe');
        urlbar.classList.add('sfbg_unsafe');
      }
    } else {
      icon.classList.remove('safeflag-unsafe');
      if (isSafeBackground) {
        MOA.debug('Set background color for safe sites.');
        urlbar.classList.remove('sfbg_unsafe');
        urlbar.classList.add('sfbg_safe');
      }
    }
    icon.hidden = false;
  }

  ns.updateIcon = function(aClassifyResult) {
    current_tab_safeflag = aClassifyResult;
    _updateIcon();
  };

  function _onPrefChange(branch, prefName) {
    window.messageManager.broadcastAsyncMessage('SafeFlag::enabledChanged')
    switch (prefName) {
      case 'enable':
        if (MOA.SafeFlag.Utils.getPrefs().getBoolPref("enable")) {
          MOA.SafeFlag.Monitor.init();
          _initIconEvent();
          _updateIcon()
        } else {
          MOA.SafeFlag.Monitor.stop();
          _stopIconEvent();
          document.getElementById('urlbar').className = default_className
        }
        break;
      case 'background.unsafe':
      case 'background.safe':
        _updateIcon();
        break;
    }
  }

  var _popup_timer_ = null;
  function _clearPopupTimer() {
    window.clearTimeout(_popup_timer_);
  }

  function _onMouseOverIcon() {
    _clearPopupTimer();

    var uri = MOA.SafeFlag.Utils.getCurrentURI();
    if (!_isActivated())
      return;

    if (!current_tab_safeflag)
      return;

    _popup_timer_ = window.setTimeout(function() {
      var popup = safeGetElementById('safeflag-popup');
      if (current_tab_safeflag.isMalware || current_tab_safeflag.isPhishing || current_tab_safeflag.isUnwanted) {
        safeGetElementById('safeflag-popup-safe').hidden = true;
        safeGetElementById('safeflag-popup-risk').hidden = false;
        popup.className = 'safeflag-popup-risk';
      } else {
        safeGetElementById('safeflag-popup-safe').hidden = false;
        safeGetElementById('safeflag-popup-risk').hidden = true;
        popup.className = 'safeflag-popup-safe';
      }
      popup.openPopup(safeGetElementById('safeflag-icon'), 'after_start', 0, 0, false, false);
    }, 400);
  }

  function _onMouseOutIcon() {
    _clearPopupTimer();
    _popup_timer_ = window.setTimeout(function() {
      safeGetElementById('safeflag-popup').hidePopup();
    }, 100);
  }

  function _onMouseOverPopup() {
    _clearPopupTimer();
  }

  function _onMouseOutPopup() {
    _clearPopupTimer();
    _popup_timer_ = window.setTimeout(function() {
      safeGetElementById('safeflag-popup').hidePopup();
    }, 100);
  }

  function _initIconEvent() {
    var icon = safeGetElementById('safeflag-icon');
    icon.addEventListener('mouseover', _onMouseOverIcon, false);
    icon.addEventListener('mouseout', _onMouseOutIcon, false);
    var popup = safeGetElementById('safeflag-popup');
    popup.addEventListener('mouseover', _onMouseOverPopup, false);
    popup.addEventListener('mouseout', _onMouseOutPopup, false);
    icon.hidden = false
  };

  function _stopIconEvent() {
    var icon = safeGetElementById('safeflag-icon');
    icon.removeEventListener('mouseover', _onMouseOverIcon, false);
    icon.removeEventListener('mouseout', _onMouseOutIcon, false);
    var popup = safeGetElementById('safeflag-popup');
    popup.removeEventListener('mouseover', _onMouseOverPopup, false);
    popup.removeEventListener('mouseout', _onMouseOutPopup, false);
    icon.hidden = true
  }

  if (MOA.SafeFlag.Utils.getPrefs().getBoolPref("enable")) {
    window.addEventListener('load', function(evt) {
      _initIconEvent();
    }, false);
  }
  MOA.SafeFlag.Utils.PrefListener('extensions.safeflag.', _onPrefChange);
})();
