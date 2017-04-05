/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is IETab. Modified In Coral IE Tab.
 *
 * The Initial Developer of the Original Code is yuoo2k <yuoo2k@gmail.com>.
 * Modified by quaful <quaful@msn.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006-2008
 * the Initial Developer. All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */
/**
 * @namespace
 */
if (typeof(COBA) == "undefined") {
  var COBA = {};
}
var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://coba/cobaUtils.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");
let Strings = cobaUtils.Strings;

COBA.getUUID = function() {
  var _uuidprf = 'extensions.coba.uuid';
  var uuid = Preferences.get(_uuidprf,"");
  if(uuid == ""){
    var uuidgen = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);
    uuid = uuidgen.generateUUID().number;
    Preferences.set(_uuidprf, uuid);
  }
  return uuid;
}

COBA.track = function(data) {
  if (!data) {
    return;
  }
  var tracker = Components.classes["@mozilla.com.cn/tracking;1"];
  if (!tracker || !tracker.getService().wrappedJSObject.ude) {
    return;
  }
  var uuid = COBA.getUUID();
  var _trackurl = 'http://addons.g-fox.cn/coba.gif';
  var image = new Image();
  image.src = _trackurl + '?r=' +  Math.random()
            + '&uuid=' + uuid
            + '&' + data.key + '=' + data.value
            ;
}

/** 将URL转换为IE Tab URL */
COBA.getCOBAURL = function(url) {
  if (COBA.startsWith(url, COBA.containerUrl)) return url;
  if (/^file:\/\/.*/.test(url)) try {
    url = decodeURI(url).replace(/\|/g, ":");
  } catch (e) {}
  return COBA.containerUrl + encodeURI(url);
}


/** 获取Firefox页面内嵌的plugin对象 */
COBA.getPluginObject = function(aTab) {
  var aBrowser = (aTab ? aTab.linkedBrowser : gBrowser);
  if (aBrowser && aBrowser.currentURI && COBA.startsWith(aBrowser.currentURI.spec, COBA.containerUrl)) {
    if (aBrowser.contentDocument) {
      var obj = aBrowser.contentDocument.getElementById(COBA.objectID);
      if (obj) {
        return (obj.wrappedJSObject ? obj.wrappedJSObject : obj); // Ref: Safely accessing content DOM from chrome
      }
    }
  }
  return null;
}

/** 获取IE Tab实际访问的URL*/
COBA.getPluginObjectURL = function(aTab) {
  var tab = aTab || null;
  var aBrowser = (tab ? tab.linkedBrowser : gBrowser);
  var url = COBA.getActualUrl(aBrowser.currentURI.spec);
  var pluginObject = COBA.getPluginObject(tab);
  if (pluginObject && pluginObject.URL && pluginObject.URL != "") {
    url = (/^file:\/\/.*/.test(url) ? encodeURI(COBA.convertToUTF8(pluginObject.URL)) : pluginObject.URL);
  }
  return COBA.getActualUrl(url);
}

/** 获取当前Tab的IE Tab URI
 *  与COBA.getPluginObjectURL功能相同
 */
COBA.getCurrentIeTabURI = function(aBrowser) {
  try {
    if (aBrowser.contentDocument && aBrowser.webNavigation && COBA.startsWith(aBrowser.webNavigation.currentURI.spec, COBA.containerUrl)) {
      let obj = aBrowser.contentDocument.getElementById(COBA.objectID);
      if (obj) {
        var pluginObject = (obj.wrappedJSObject ? obj.wrappedJSObject : obj); // Ref: Safely accessing content DOM from chrome
        if (pluginObject.URL) {
          return Services.io.newURI(COBA.containerUrl + encodeURI(pluginObject.URL), null, null);
        }
      }
    }
  } catch (e) {
    cobaUtils.LOG('COBA.getCurrentIeTabURI: ' + e);
  }
  return null;
}

/** 是否是IE内核*/
COBA.isIEEngine = function(aTab) {
  var tab = aTab || gBrowser.mCurrentTab;
  var aBrowser = (aTab ? aTab.linkedBrowser : gBrowser);
  if (aBrowser && aBrowser.currentURI && COBA.startsWith(aBrowser.currentURI.spec, COBA.containerUrl)) {
    return true;
  }
  return false;
}

/** 切换某个Tab的内核
 *  通过设置不同的URL实现切换内核的功能。
 *  使用IE内核时，将URL转换为ie tab URL再访问；
 *  使用Firefox内核时，不需转换直接访问。
 *  返回一个表示是否切换至 IE 模式的 bool
 */
COBA.switchTabEngine = function(aTab) {
  if (aTab && aTab.localName == "tab") {
    // 实际浏览的URL
    var url = COBA.getPluginObjectURL(aTab);

    var isIEEngineAfterSwitch = !COBA.isIEEngine(aTab);
    var domain = COBA.getUrlDomain(url).toLowerCase();
    if (isIEEngineAfterSwitch && aTab.getAttribute("skipDomain") == domain) {
      aTab.setAttribute("skipDomain","");
    }
    if (!isIEEngineAfterSwitch) {
      // Now it is IE engine, call me means users want to switch to Firefox engine.
      // We have to tell watcher that this is manual switching, do not switch back to IE engine
      aTab.setAttribute("skipDomain",domain);
    }
    let zoomLevel = COBA.getZoomLevel();
    COBA.setTabAttributeJSON(aTab, 'zoom', {zoomLevel: zoomLevel});


    // firefox特有地址只允许使用Firefox内核
    if (isIEEngineAfterSwitch && !COBA.isFirefoxOnly(url)){
      // ie tab URL
      url = COBA.getCOBAURL(url);
    }
    if (aTab.linkedBrowser && aTab.linkedBrowser.currentURI.spec != url) aTab.linkedBrowser.loadURI(url);

    return isIEEngineAfterSwitch;
  }
  return false;
}

COBA.setUrlBarSwitchButtonStatus = function(isIEEngine) {
  // Firefox特有页面禁止内核切换
  let url = COBA.getPluginObjectURL();
  let btn = document.getElementById("coba-current-engine");
  if (btn) {
    btn.disabled = COBA.isFirefoxOnly(url);
    btn.style.visibility = "visible";
    btn.setAttribute("engine", (isIEEngine ? "ie" : "fx"));
  }

  // 更新内核切换按钮文字
  let label = document.getElementById("coba-urlbar-switch-label");
  if (label) {
    let labelId = isIEEngine ? "coba.urlbar.switch.label.ie" : "coba.urlbar.switch.label.fx";
    label.value = Strings.global.GetStringFromName(labelId);
  }
  // 更新内核切换按钮tooltip文字
  let tooltip = document.getElementById("coba-urlbar-switch-tooltip2");
  if (tooltip) {
    let tooltipId = isIEEngine ? "coba.urlbar.switch.tooltip2.ie" : "coba.urlbar.switch.tooltip2.fx";
    tooltip.value = Strings.global.GetStringFromName(tooltipId);
  }
  var btn_urlbar_icon = document.getElementById("coba-urlbar-icon");
  btn_urlbar_icon.setAttribute("hidden", (isIEEngine ? "false" : "true"));
}

// Tab popmenu状态与地址栏状态相同
COBA.updateTabMenu = function() {
  let urlbarButton = document.getElementById("coba-urlbar-switch");
  let menu = document.getElementById("coba-tab-switch");
  if (urlbarButton && menu) {
    if (COBA.isIEEngine(COBA.getContextTab())) {
      menu.label = menu.getAttribute("data-label-fx");
    } else {
      menu.label = menu.getAttribute("data-label-ie");
    }
  }
}

/** 切换当前页面内核*/
COBA.switchEngine = function() {
  COBA.switchTabEngine(gBrowser.mCurrentTab);
}

/** 打开配置对话框 */
COBA.openOptionsDialog = function(url) {
  if (!url) url = COBA.getPluginObjectURL();
  var icon = document.getElementById('ietab-status');
  window.openDialog('chrome://coba/content/setting.xul', "cobaOptionsDialog", 'chrome,centerscreen', COBA.getUrlDomain(url), icon);
}

/** 新建一个ie标签*/
COBA.addIeTab = function(url) {
  let newTab = gBrowser.addTab(COBA.getCOBAURL(url));
  gBrowser.selectedTab = newTab;
  if (gURLBar && (url == 'about:blank')) window.setTimeout(function() {
    gURLBar.focus();
  }, 0);
  return newTab;
}

COBA.getHandledURL = function(url, isModeIE) {
  url = url.trim();

  // 访问firefox特有地址时, 只允许使用firefox内核
  if (COBA.isFirefoxOnly(url)) {
    return url;
  }

  if (isModeIE) return COBA.getCOBAURL(url);

  if (COBA.isIEEngine() && (!COBA.startsWith(url, "about:")) && (!COBA.startsWith(url, "view-source:"))) {
    if (COBA.isValidURL(url) || COBA.isValidDomainName(url)) {
      var isBlank = (COBA.getActualUrl(gBrowser.currentURI.spec) == "about:blank");
      var handleUrlBar = Services.prefs.getBoolPref("extensions.coba.handleUrlBar", false);
      var isSimilar = (COBA.getUrlDomain(COBA.getPluginObjectURL()) == COBA.getUrlDomain(url));
      if (isBlank || handleUrlBar || isSimilar) return COBA.getCOBAURL(url);
    }
  }

  return url;
}

/** 检查URL地址是否是火狐浏览器特有
 *  例如 about:config chrome://xxx
 */
COBA.isFirefoxOnly = function(url) {
   return(url && (url.length>0) &&
             ((COBA.startsWith(url, 'about:') && url != "about:blank") ||
              COBA.startsWith(url, 'chrome://')
             )
         );
}

/** 更新地址栏显示*/
COBA.updateUrlBar = function() {
  COBA.setUrlBarSwitchButtonStatus(COBA.isIEEngine());

  if (!gURLBar || !COBA.isIEEngine())
    return;
  if (gBrowser.userTypedValue) {
    if (gURLBar.selectionEnd != gURLBar.selectionStart) window.setTimeout(function() {
      gURLBar.focus();
    }, 0);
  } else {
    var url = COBA.getPluginObjectURL();
    if (url == "about:blank")
      url = "";
    if (gURLBar.value != url)
      gURLBar.value = url;
  }

  // 更新收藏状态(星星按钮黄色时表示该页面已收藏)
  if (window.PlacesStarButton)
    PlacesStarButton.updateState();
  else
    BookmarkingUI.updateStarState();
}

/** 改变页面元素启用状态*/
COBA.updateObjectDisabledStatus = function(objId, isEnabled) {
  var obj = (typeof(objId) == "object" ? objId : document.getElementById(objId));
  if (obj) {
    var d = obj.hasAttribute("disabled");
    if (d == isEnabled) {
      if (d) obj.removeAttribute("disabled");
      else obj.setAttribute("disabled", true);
    }
  }
}

/** 更新前进、后退铵钮状态*/
COBA.updateBackForwardButtons = function() {
  var pluginObject = COBA.getPluginObject();
  var canBack = (pluginObject ? pluginObject.CanBack : false) || gBrowser.webNavigation.canGoBack;
  var canForward = (pluginObject ? pluginObject.CanForward : false) || gBrowser.webNavigation.canGoForward;
  COBA.updateObjectDisabledStatus("Browser:Back", canBack);
  COBA.updateObjectDisabledStatus("Browser:Forward", canForward);
}

/** 更新停止和刷新按钮状态*/
COBA.updateStopReloadButtons = function() {
  try {
    var pluginObject = COBA.getPluginObject();
    var isBlank = (gBrowser.currentURI.spec == "about:blank");
    var isLoading = gBrowser.mIsBusy;
    COBA.updateObjectDisabledStatus("Browser:Reload", pluginObject ? pluginObject.CanRefresh : !isBlank);
    COBA.updateObjectDisabledStatus("Browser:Stop", pluginObject ? pluginObject.CanStop : isLoading);
  } catch (e) {}
}

// 更新编辑菜单中cmd_cut、cmd_copy、cmd_paste状态
COBA.updateEditMenuItems = function(e) {
  if (e.originalTarget != document.getElementById("menu_EditPopup")) return;
  var pluginObject = COBA.getPluginObject();
  if (pluginObject) {
    COBA.updateObjectDisabledStatus("cmd_cut", pluginObject.CanCut);
    COBA.updateObjectDisabledStatus("cmd_copy", pluginObject.CanCopy);
    COBA.updateObjectDisabledStatus("cmd_paste", pluginObject.CanPaste);
  }
}

// @todo 这是哪个按钮？
COBA.updateSecureLockIcon = function() {
  var pluginObject = COBA.getPluginObject();
  if (pluginObject) {
    var securityButton = document.getElementById("security-button");
    if (securityButton) {
      var url = pluginObject.URL;
      const wpl = Ci.nsIWebProgressListener;
      var state = (COBA.startsWith(url, "https://") ? wpl.STATE_IS_SECURE | wpl.STATE_SECURE_HIGH : wpl.STATE_IS_INSECURE);
      window.XULBrowserWindow.onSecurityChange(null, null, state);
      securityButton.setAttribute("label", COBA.getUrlHost(pluginObject.URL));
    }
  }
}

/** 更新界面显示*/
COBA.updateInterface = function() {
  COBA.updateBackForwardButtons();
  COBA.updateStopReloadButtons();
  COBA.updateSecureLockIcon();

  if (!!document.getElementById("urlbar-container")) {
    COBA.updateUrlBar();
  }
}

/** 更新相关的界面*/
COBA.updateAll = function() {
  if (COBA.updating) return;
  try {
    COBA.updating = true;
    COBA.updateInterface();
  } finally {
    COBA.updating = false;
  }
}

COBA.updateProgressStatus = function() {
  var mTabs = gBrowser.mTabContainer.childNodes;
  for (var i = 0; i < mTabs.length; i++) {
    if (mTabs[i].localName == "tab") {
      var pluginObject = COBA.getPluginObject(mTabs[i]);
      if (pluginObject) {
        var aCurTotalProgress = pluginObject.Progress;
        if (aCurTotalProgress != mTabs[i].mProgress) {
          const wpl = Ci.nsIWebProgressListener;
          var aMaxTotalProgress = (aCurTotalProgress == -1 ? -1 : 100);
          var aTabListener = gBrowser.mTabListeners[mTabs[i]._tPos];
          var aWebProgress = mTabs[i].linkedBrowser.webProgress;
          var aRequest = Services.io.newChannelFromURI(mTabs[i].linkedBrowser.currentURI);
          var aStateFlags = (aCurTotalProgress == -1 ? wpl.STATE_STOP : wpl.STATE_START) | wpl.STATE_IS_NETWORK;
          aTabListener.onStateChange(aWebProgress, aRequest, aStateFlags, 0);
          aTabListener.onProgressChange(aWebProgress, aRequest, 0, 0, aCurTotalProgress, aMaxTotalProgress);
          mTabs[i].mProgress = aCurTotalProgress;
        }
      }
    }
  }
}

/** 响应页面正在加载的消息*/
COBA.onIEProgressChange = function(event) {
  var progress = parseInt(event.detail);
  if (progress == 0) gBrowser.userTypedValue = null;
  COBA.updateProgressStatus();
  COBA.updateAll();
  COBA.focusIE();
}

/** 响应新开IE标签的消息*/
COBA.onNewIETab = function(event) {
  let data = JSON.parse(event.detail);
  let url = data.url;
  let id = data.id;
  let tab = COBA.addIeTab(url);
  var param = {id: id};
  COBA.setTabAttributeJSON(tab, COBA.navigateParamsAttr, param);
  COBA.focusIE();
}

COBA.onSecurityChange = function(security) {
  COBA.updateSecureLockIcon();
}

/** 异步调用plugin的方法*/
COBA.goDoCommand = function(cmd) {
  try {
    var pluginObject = COBA.getPluginObject();
    if (pluginObject == null) {
      return false;
    }
    var param = null;
    switch (cmd) {
    case "Back":
      if (!pluginObject.CanBack) {
        return false;
      }
      break;
    case "Forward":
      if (!pluginObject.CanForward) {
        return false;
      }
      break;
    }
    window.setTimeout(function() {
      COBA.delayedGoDoCommand(cmd);
    }, 100);
    return true;
  } catch (ex) {}
  return false;
}

/** 配合COBA.goDoCommand完成对plugin方法的调用*/
COBA.delayedGoDoCommand = function(cmd) {
  try {
    var pluginObject = COBA.getPluginObject();
    switch (cmd) {
    case "Back":
      pluginObject.Back();
      break;
    case "Forward":
      pluginObject.Forward();
      break;
    case "Stop":
      pluginObject.Stop();
      break;
    case "Refresh":
      pluginObject.Refresh();
      break;
    case "SaveAs":
      pluginObject.SaveAs();
      break;
    case "Print":
      pluginObject.Print();
      break;
    case "PrintSetup":
      pluginObject.PrintSetup();
      break;
    case "PrintPreview":
      pluginObject.PrintPreview();
      break;
    case "Find":
      pluginObject.Find();
      break;
    case "cmd_cut":
      pluginObject.Cut();
      break;
    case "cmd_copy":
      pluginObject.Copy();
      break;
    case "cmd_paste":
      pluginObject.Paste();
      break;
    case "cmd_selectAll":
      pluginObject.SelectAll();
      break;
    case "Focus":
      pluginObject.Focus();
      break;
    case "HandOverFocus":
      pluginObject.HandOverFocus();
      break;
    case "Zoom":
      var zoomLevel = COBA.getZoomLevel();
      pluginObject.Zoom(zoomLevel);
      break;
    case "DisplaySecurityInfo":
      pluginObject.DisplaySecurityInfo();
    break;
    }
  } catch (ex) {
  } finally {
    window.setTimeout(function() {
      COBA.updateAll();
    }, 0);
  }
}

/** 关闭Tab页
 * @param {number} i Tab页index
 */
COBA.closeTab = function(i) {
  var mTabs = gBrowser.mTabContainer.childNodes;
  gBrowser.removeTab(mTabs[i]);
}

/** 获取右键菜单关联的Tab对象*/
COBA.getContextTab = function() {
  return (gBrowser && gBrowser.mContextTab && (gBrowser.mContextTab.localName == "tab") ? gBrowser.mContextTab : null);
}

// 响应内核切换按钮点击事件
COBA.clickSwitchButton = function(e) {
  // 左键或中键点击切换内核
  if (e.button <= 1 && !e.target.disabled) {
    var aTab = gBrowser.mCurrentTab;
    if (!aTab) return;
    COBA.switchTabEngine(aTab);
  }

  // 右键点击显示选项菜单
  else if (e.button == 2) {
    document.getElementById("coba-switch-button-context-menu").openPopup(e.target, "after_start", 0, 0, true, false);
  }

  e.preventDefault();
}

/** 将焦点设置到IE窗口上*/
COBA.focusIE = function() {
  COBA.goDoCommand("Focus");
}

COBA.onTabSelected = function(e) {
  COBA.updateAll();
  COBA.focusIE();
}

COBA.switchToIEByDoc = {
  // nsISupports
  QueryInterface: function(iid) {
    if (iid.equals(Ci.nsISupports) ||
      iid.equals(Ci.nsIObserver)) {
      return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  // nsIObserver
  observe: function(subject, topic, data) {
    var tab = COBA.getTabByDocument(subject);
    tab && COBA.switchTabEngine(tab);
  },
}

/** 获取document对应的Tab对象*/
COBA.getTabByDocument = function(doc) {
  var mTabs = gBrowser.mTabContainer.childNodes;
  for (var i = 0; i < mTabs.length; i++) {
    var tab = mTabs[i];
    if (tab.linkedBrowser.contentDocument == doc) {
      return tab
    }
  }
  return null;
}

/** 加载或显示页面时更新界面*/
COBA.onPageShowOrLoad = function(e) {
  COBA.updateAll();

  var doc = e.originalTarget;

  var tab = COBA.getTabByDocument(doc);
  if (!tab) return;

  //
  // 检查是否需要设置ZoomLevel
  //
  let zoomLevelParams = COBA.getTabAttributeJSON(tab, 'zoom');
  if (zoomLevelParams) {
    COBA.setZoomLevel(zoomLevelParams.zoomLevel);
    tab.removeAttribute(tab, 'zoom');
  }
}

COBA.getTabAttributeJSON =  function(tab, name) {
  let attrString = tab.getAttribute(name);
  if (!attrString) {
    return null;
  }

  try {
    let json = JSON.parse(attrString);
    return json;
  } catch (ex) {
    cobaUtils.LOG('COBA.getTabAttributeJSON:' + ex);
  }

  return null;
}

COBA.setTabAttributeJSON = function(tab, name, value) {
  let attrString = JSON.stringify(value);
  tab.setAttribute(name, attrString);
}

/** 响应界面大小变化事件
 */
COBA.onResize = function(e) {
  // Zoom时会触发Resize事件
  COBA.goDoCommand("Zoom");
}

COBA.hookBrowserGetter = function(aBrowser) {
  if (aBrowser.localName != "browser") aBrowser = aBrowser.getElementsByTagNameNS(kXULNS, "browser")[0];

  let browserGetCurrentURI = aBrowser.__lookupGetter__('currentURI');
  aBrowser.__defineGetter__('currentURI', function() {
    let uri = COBA.getCurrentIeTabURI(this);
    if (uri) return uri;
    return browserGetCurrentURI.apply(aBrowser, arguments);
  });

  let browserGetSessionHistory = aBrowser.__lookupGetter__('sessionHistory');
  aBrowser.__defineGetter__('sessionHistory', function() {
    let history = this.webNavigation.sessionHistory;
    let uri = COBA.getCurrentIeTabURI(this);
    if (uri) {
      let entry = history.getEntryAtIndex(history.index, false);
      if (entry.URI.spec != uri.spec) {
        entry.QueryInterface(Ci.nsISHEntry).setURI(uri);
        if (this.parentNode.__SS_data) delete this.parentNode.__SS_data;
      }
    }
    return browserGetSessionHistory.apply(aBrowser, arguments);
  });
}

COBA.hookURLBarSetter = function(aURLBar) {
  if (!aURLBar)
    aURLBar = document.getElementById("urlbar");
  if (!aURLBar)
    return;
  aURLBar.onclick = function(e) {
    var pluginObject = COBA.getPluginObject();
    if (pluginObject) {
      COBA.goDoCommand("HandOverFocus");
    }
  }

  let oGetter = aURLBar.__lookupGetter__('value');
  let oSetter = aURLBar.__lookupSetter__('value');
  aURLBar.__defineSetter__('value', function() {
    this.isModeIE = arguments[0] && (arguments[0].substr(0, COBA.containerUrl.length) == COBA.containerUrl);
    if (this.isModeIE) {
      arguments[0] = COBA.getActualUrl(arguments[0]);
    }
    return oSetter.apply(aURLBar, arguments);
  });
  aURLBar.__defineGetter__('value', oGetter);
}

COBA.hookCodeAll = function() {
  //hook properties
  COBA.hookBrowserGetter(gBrowser.mTabContainer.firstChild.linkedBrowser);
  COBA.hookURLBarSetter(gURLBar);

  let orgiBookmarkPage = PlacesCommandHook.bookmarkPage;
  PlacesCommandHook.bookmarkPage = function() {
    let args = [].slice.call(arguments);
    let browser = args.shift();
    let proxy = new Proxy(browser, {
      get: function(target, name) {
        if (name == 'currentURI') {
          return makeURI(COBA.getActualUrl(target.currentURI.spec));
        } else {
          return target[name];
        }
      }
    });
    args.unshift(proxy);
    return orgiBookmarkPage.apply(PlacesCommandHook, args);
  };

  // COBA.hookCode("BookmarkingUI.updateStarState", /(gBrowser|getBrowser\(\))\.currentURI/g, "makeURI(COBA.getActualUrl($&.spec))");
  let orgiUpdateStarState = BookmarkingUI.updateStarState;
  BookmarkingUI.updateStarState = function() {
    BookmarkingUI.__defineSetter__('_uri', function(newURI) {
      delete this._uri;
      this._uri = makeURI(COBA.getActualUrl(newURI.spec));
    });

    return orgiUpdateStarState.apply(BookmarkingUI, arguments);
  };

  // COBA.hookCode("gBrowser.addTab", "return t;", "COBA.hookBrowserGetter(t.linkedBrowser); $&");
  // Conflict with tabimprovelite, set it as an global value
  window.COBA.origAddTab = gBrowser.addTab;
  gBrowser.addTab = function() {
    let tab = window.COBA.origAddTab.apply(gBrowser, arguments);
    COBA.hookBrowserGetter(tab.linkedBrowser);
    return tab;
  };

  // COBA.hookCode("gBrowser.setTabTitle", "if (browser.currentURI.spec) {", "$& if (browser.currentURI.spec.indexOf(COBA.containerUrl) == 0) return;"); // 取消原有的Tab标题文字设置
  let orgiSetTabTitle = gBrowser.setTabTitle;
  gBrowser.setTabTitle = function(aTab) {
    var browser = this.getBrowserForTab(aTab);
    var title = browser.contentTitle;
    if (!title && browser.currentURI.spec && browser.currentURI.spec.indexOf(COBA.containerUrl) == 0) return false;
    return orgiSetTabTitle.apply(gBrowser, arguments);
  };

  // COBA.hookCode("getShortcutOrURI", /return (\S+);/g, "return COBA.getHandledURL($1);"); // 访问新的URL

  //hook Interface Commands
  // COBA.hookCode("BrowserBack", /{/, "$& if(COBA.goDoCommand('Back')) return;");
  let orgiBrowserBack = BrowserBack;
  BrowserBack = function() {
    if(COBA.goDoCommand('Back')) return;
    return orgiBrowserBack.apply(window, arguments);
  };

  // COBA.hookCode("BrowserForward", /{/, "$& if(COBA.goDoCommand('Forward')) return;");
  let origBrowserForward = BrowserForward;
  BrowserForward = function() {
    if(COBA.goDoCommand('Forward')) return;
    return origBrowserForward.apply(window, arguments);
  };

  // COBA.hookCode("BrowserStop", /{/, "$& if(COBA.goDoCommand('Stop')) return;");
  let origBrowserStop = BrowserStop;
  BrowserStop = function() {
    if(COBA.goDoCommand('Stop')) return;
    return origBrowserStop.apply(window, arguments);
  };

  // COBA.hookCode("BrowserReload", /{/, "$& if(COBA.goDoCommand('Refresh')) return;");
  let origBrowserReload = BrowserReload;
  BrowserReload = function() {
    if(COBA.goDoCommand('Refresh')) return;
    return origBrowserReload.apply(window, arguments);
  };

  // COBA.hookCode("BrowserReloadSkipCache", /{/, "$& if(COBA.goDoCommand('Refresh')) return;");
  let origBrowserReloadSkipCache = BrowserReloadSkipCache;
  BrowserReloadSkipCache = function() {
    if(COBA.goDoCommand('Refresh')) return;
    return origBrowserReloadSkipCache.apply(window, arguments);
  };

  // COBA.hookCode("saveDocument", /{/, "$& if(COBA.goDoCommand('SaveAs')) return;");
  let orgiSaveDocument = saveDocument;
  saveDocument = function() {
    if(COBA.goDoCommand('SaveAs')) return;
    return orgiSaveDocument.apply(window, arguments);
  };

  // COBA.hookCode("MailIntegration.sendMessage", /{/, "$& var pluginObject = COBA.getPluginObject(); if(pluginObject){ arguments[0]=pluginObject.URL; arguments[1]=pluginObject.Title; }"); // @todo 发送邮件？
  let origSendMessage = MailIntegration.sendMessage;
  MailIntegration.sendMessage = function() {
    var pluginObject = COBA.getPluginObject();
    if (pluginObject) {
      arguments[0] = pluginObject.URL;
      arguments[1]=pluginObject.Title;
    }
    return origSendMessage.apply(MailIntegration, arguments);
  };

  // COBA.hookCode("PrintUtils.print", /{/, "$& if(COBA.goDoCommand('Print')) return;");
  let origPrint = PrintUtils.print;
  PrintUtils.print = function() {
    if(COBA.goDoCommand('Print')) return;
    return origPrint.apply(PrintUtils, arguments);
  };

  // COBA.hookCode("PrintUtils.showPageSetup", /{/, "$& if(COBA.goDoCommand('PrintSetup')) return;");
  let origShowPageSetup = PrintUtils.showPageSetup;
  PrintUtils.showPageSetup = function() {
    if(COBA.goDoCommand('PrintSetup')) return;
    return origShowPageSetup.apply(PrintUtils, arguments);
  };

  // COBA.hookCode("PrintUtils.printPreview", /{/, "$& if(COBA.goDoCommand('PrintPreview')) return;");
  let origPrintPreview = PrintUtils.printPreview;
  PrintUtils.printPreview = function() {
    if(COBA.goDoCommand('PrintPreview')) return;
    return origPrintPreview.apply(PrintUtils, arguments);
  };

  // COBA.hookCode("goDoCommand", /{/, "$& if(COBA.goDoCommand(arguments[0])) return;"); // cmd_cut, cmd_copy, cmd_paste, cmd_selectAll
  let origGoDoCommand = goDoCommand;
  goDoCommand = function() {
    if(COBA.goDoCommand(arguments[0])) return;
    return origGoDoCommand.apply(window, arguments);
  };

  COBA.hookAttr("cmd_find", "oncommand", "if(COBA.goDoCommand('Find')) return;");
  COBA.hookAttr("cmd_findAgain", "oncommand", "if(COBA.goDoCommand('Find')) return;");
  COBA.hookAttr("cmd_findPrevious", "oncommand", "if(COBA.goDoCommand('Find')) return;");

  // COBA.hookCode("displaySecurityInfo", /{/, "$& if(COBA.goDoCommand('DisplaySecurityInfo')) return;");
  let origDisplaySecurityInfo = displaySecurityInfo;
  displaySecurityInfo = function() {
    if(COBA.goDoCommand('DisplaySecurityInfo')) return;
    return origDisplaySecurityInfo.apply(window, arguments);
  };
}


COBA.addEventAll = function() {
  Services.obs.addObserver(COBA.HttpObserver, 'http-on-modify-request', false);
  COBA.CookieObserver.register();
  COBA.Observer.register();
  COBA.addEventListener("tabContextMenu", "popupshowing", COBA.updateTabMenu);

  COBA.addEventListener(window, "DOMContentLoaded", COBA.onPageShowOrLoad);
  COBA.addEventListener(window, "pageshow", COBA.onPageShowOrLoad);
  COBA.addEventListener(window, "resize", COBA.onResize);

  COBA.addEventListener(gBrowser.tabContainer, "TabSelect", COBA.onTabSelected);

  COBA.addEventListener("menu_EditPopup", "popupshowing", COBA.updateEditMenuItems);

  COBA.addEventListener(window, "IeProgressChanged", COBA.onIEProgressChange);
  COBA.addEventListener(window, "NewIETab", COBA.onNewIETab);
  Services.obs.addObserver(COBA.switchToIEByDoc, "COBA-swith-to-ie", false);
}

COBA.removeEventAll = function() {
  Services.obs.removeObserver(COBA.HttpObserver, 'http-on-modify-request');
  COBA.CookieObserver.unregister();
  COBA.Observer.unregister();

  COBA.removeEventListener("tabContextMenu", "popupshowing", COBA.updateTabMenu);

  COBA.removeEventListener(window, "DOMContentLoaded", COBA.onPageShowOrLoad);
  COBA.removeEventListener(window, "pageshow", COBA.onPageShowOrLoad);
  COBA.removeEventListener(window, "resize", COBA.onResize);

  COBA.removeEventListener(gBrowser.tabContainer, "TabSelect", COBA.onTabSelected);

  COBA.removeEventListener("menu_EditPopup", "popupshowing", COBA.updateEditMenuItems);

  COBA.removeEventListener(window, "ProgressChanged", COBA.onIEProgressChange);
  COBA.removeEventListener(window, "NewIETab", COBA.onNewIETab);
  Services.obs.removeObserver(COBA.switchToIEByDoc, "COBA-swith-to-ie");
}

COBA.init = function() {
  COBA.removeEventListener(window, "load", COBA.init);
  if (!!document.getElementById("urlbar-container")) {
    COBA.initNow();
  } else {
    COBA.initLater();
  }

  // Clear IE compat mode settings
  let wrk = Cc["@mozilla.org/windows-registry-key;1"].createInstance(Ci.nsIWindowsRegKey);
  wrk.open(wrk.ROOT_KEY_CURRENT_USER, "SOFTWARE\\Microsoft\\Internet Explorer\\Main\\FeatureControl\\FEATURE_BROWSER_EMULATION", wrk.ACCESS_ALL);
  try {
    wrk.removeValue('firefox.exe');
    wrk.removeValue('plugin-container.exe');
  } catch(e) {}
}

COBA.initDone = false;

COBA.initLater = function() {
  var self = COBA;
  self.initDone = false;
  var navbar = document.getElementById("nav-bar");
  if (!navbar)
    return;

  if (window.MutationObserver) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type != 'attributes' ||
            mutation.target != navbar ||
            mutation.attributeName != 'currentset') {
          return;
        }

        if (!!document.getElementById("urlbar-container")) {
          self.initNow();
        }
      });
    });

    var config = {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['currentset']
    };
    observer.observe(navbar, config);
  }
}

COBA.initNow = function() {
  if (COBA.initDone)
    return;
  COBA.initDone = true;
//  setTimeout(function() {
//    if (gBrowser.currentURI.spec != "about:blank")
//      return;
//    gBrowser.contentDocument.documentElement.focus();
//    window.focusAndSelectUrlBar()
//  },800)

  /**
   * navigator.plugins方法将使得最新安装的插件可用，更新相关数组，如 plugins 数组，并可选重新装入包含插件的已打开文档。
   * 你可以使用下列语句调用该方法：
   * navigator.plugins.refresh(true)
   * navigator.plugins.refresh(false)
   * 如果你给定 true 的话，refresh 将在使得新安装的插件可用的同时，重新装入所有包含有嵌入对象(EMBED 标签)的文档。
   *如果你给定 false 的话，该方法则只会刷新 plugins 数组，而不会重新载入任何文档。
   * 当用户安装插件后，该插件将不会可用，除非调用了 refresh，或者用户关闭并重新启动了 Navigator。
   */
  navigator.plugins.refresh(false);

  // 创建同步Cookie的plugin
//  let item = document.createElementNS("http://www.w3.org/1999/xhtml", "html:embed");
//  item.hidden = true;
//  item.setAttribute("id", "coba-cookie-object");
//  item.setAttribute("type", "application/coba");
//  let mainWindow = document.getElementById("main-window");
//  mainWindow.appendChild(item);

  COBA.hookCodeAll();
  COBA.addEventAll();
  COBA.updateAll();

  COBA.setupShortcut();
  COBA.setupUrlBar();
}

COBA.destroy = function() {
  COBA.removeEventListener(window, "unload", COBA.destroy);

  COBA.removeEventAll();
}

// 设置内核切换快捷键
COBA.setupShortcut = function() {
  try {
    let keyItem = document.getElementById('key_cobaToggle');
    if (keyItem) {
      // Default key is "C"
      keyItem.setAttribute('key', Services.prefs.getCharPref('extensions.coba.shortcut.key', 'C'));
      // Default modifiers is "alt"
      keyItem.setAttribute('modifiers', Services.prefs.getCharPref('extensions.coba.shortcut.modifiers', 'alt'));
    }
  } catch (e) {
    cobaUtils.ERROR(e);
  }
}

// 设置地址栏按钮
COBA.setupUrlBar = function() {
  let showUrlBarLabel = Services.prefs.getBoolPref("extensions.coba.showUrlBarLabel", true);
  document.getElementById("coba-urlbar-switch-label").hidden = !showUrlBarLabel;
  var btn_identity = document.getElementById("identity-box");
  btn_identity && btn_identity.addEventListener("click", COBA.clickFavIcon, false);
  var btn_urlbar_icon = document.getElementById("coba-urlbar-icon");
  btn_urlbar_icon && btn_urlbar_icon.addEventListener("click", COBA.clickUrlbarIcon, false);
}

COBA.clickFavIcon = function (e) {
  COBA.track({key: 'click', value: 'favicon'})
  COBA.showPanel(e)
}

COBA.clickUrlbarIcon = function (e) {
  COBA.track({key: 'click', value: 'urlbar'})
  COBA.showPanel(e)
}

// identity-box事件
COBA.showPanel = function (e) {
  if (e.button == 0) {
    var location = gBrowser.contentWindow.location;

   if (location.href.indexOf(COBA.containerUrl) == 0) {
      COBA.notify(e.originalTarget);
    }
  }

  e.preventDefault();
}

COBA.notify = function (ele) {
  var panel = document.getElementById("coba-identity-popup");
  panel.openPopup(ele);
}

COBA.hideNotify = function () {
  var panel = document.getElementById("coba-identity-popup");
  panel.hidePopup();
}

const PREF_BRANCH = "extensions.coba.";

/**
 * Observer monitering the preferences.
 */
COBA.Observer = {
  _branch: null,

  observe: function(subject, topic, data) {
    if (topic === "nsPref:changed") {
      let prefName = PREF_BRANCH + data;
      if (prefName.indexOf("shortcut.") != -1) {
        COBA.setupShortcut();
      } else if (prefName === "extensions.coba.showUrlBarLabel") {
        COBA.setupUrlBar();
      }
    }
  },

  register: function() {
    this._branch = Services.prefs.getBranch(PREF_BRANCH);
    if (this._branch) {
      // Now we queue the interface called nsIPrefBranch2. This interface is described as:
      // "nsIPrefBranch2 allows clients to observe changes to pref values."
      this._branch.QueryInterface(Ci.nsIPrefBranch2);
      this._branch.addObserver("", this, false);
    }

  },

  unregister: function() {
    if (this._branch) {
      this._branch.removeObserver("", this);
    }
  }
};

COBA.identityPopupShown = function() {
  document.getElementById('coba-identity-popup-more-info-button').focus();
  COBA.checkAlwaysUseIE();
};

COBA.checkAlwaysUseIE = function() {
  /* anything to consider before using getActualUrl ? */
  var url = COBA.getActualUrl(gBrowser.currentURI.spec);
  var list = "";
  try {
    list = Services.prefs.getCharPref("extensions.coba.filterlist");
  } catch(e) {};
  list = list.split(" ");
  var enabledIndex = list.indexOf(url);
  var checkbox = document.getElementById("coba-identity-popup-always-ie-checkbox");

  checkbox.checked = (enabledIndex > -1);
};

COBA.toggleAlwaysUseIE = function() {
  var url = COBA.getActualUrl(gBrowser.currentURI.spec);
  var list = "";
  try {
    list = Services.prefs.getCharPref("extensions.coba.filterlist");
  } catch(e) {};
  list = list.split(" ");
  var disabledIndex = list.indexOf(url + "\b");
  var enabledIndex = list.indexOf(url);
  var checkbox = document.getElementById("coba-identity-popup-always-ie-checkbox");

  if (checkbox.checked) {
    if (disabledIndex > -1) {
      list.splice(disabledIndex, 1, url);
    } else if (enabledIndex == -1) {
      list.push(url);
    }
    list.sort();

    COBA.track({key: "always", value: encodeURIComponent(url.split("?")[0])});
  } else {
    if (enabledIndex > -1) {
      list.splice(enabledIndex, 1);
    }
  }
  try {
    Services.prefs.setCharPref("extensions.coba.filterlist", list.join(" "));
  } catch(e) {};
};

window.addEventListener("load", COBA.init, false);
window.addEventListener("unload", COBA.destroy, false);
COBA.engineAttr = "cobaEngine";
