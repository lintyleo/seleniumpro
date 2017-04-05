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
var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://coba/cobaUtils.jsm");

var COBA = COBA ||{};

COBA.exportSettings = function () {
  var aOld = COBA._getAllSettings(false);
  COBA.setOptions(true);
  var aCurrent = COBA._getAllSettings(false);
  if (aCurrent) COBA._saveToFile(aCurrent);
  COBA._setAllSettings(aOld);
}

COBA.importSettings = function () {
  var aOld = COBA._getAllSettings(false);
  var [result, aList] = COBA._loadFromFile();
  if (result) {
    if (aList) {
      COBA._setAllSettings(aList);
      COBA.initDialog();
      COBA._setAllSettings(aOld);
      COBA.updateApplyButton(true);
    } else {
//      alert(cobaUtils.Strings.global.GetStringFromName("coba.settings.import.error"));
    }
  }
}

COBA.restoreDefaultSettings = function () {
  var aOld = COBA._getAllSettings(false);
  var aDefault = COBA._getAllSettings(true);
  COBA._setAllSettings(aDefault);
  COBA.initDialog();
  COBA._setAllSettings(aOld);
  COBA.updateApplyButton(true);
}

// 应用设置
COBA.setOptions = function (quiet) {
  var requiresRestart = false;

  //filter
  var filter = document.getElementById('filtercbx').checked;
  Services.prefs.setBoolPref("extensions.coba.filter", filter);
  Services.prefs.setCharPref("extensions.coba.filterlist", COBA.getFilterListString());

  //official filter
  var filter = document.getElementById('filtercbx-official').checked;
  Services.prefs.setBoolPref("extensions.coba.official.filter", filter);
  var update = document.getElementById('autoUpdateFilter').checked;
  Services.prefs.setBoolPref("extensions.coba.official.filter.update", update);
  Services.prefs.setCharPref("extensions.coba.official.filterlist", COBA.getOfficialFilterListString());

  //general
/*  COBA.setBoolPref("extensions.coba.handleUrlBar", document.getElementById('handleurl').checked);
  var runInProcess = document.getElementById('runinprocess').checked;
  if (runInProcess != Services.prefs.getBoolPref("extensions.coba.runinprocess")) {
    requiresRestart = true;
    COBA.setBoolPref("extensions.coba.runinprocess", runInProcess);
    COBA.setBoolPref("dom.ipc.plugins.enabled.npcoba.dll", !runInProcess);
  }
*/
  //update UI
  COBA.updateApplyButton(false);

  //notify of restart requirement
  if (requiresRestart && !quiet) {
    alert(cobaUtils.Strings.global.GetStringFromName("coba.settings.alert.restart"));
  }
}

COBA.getPrefOfficialFilterList = function (def) {
  var s = "";
  if (def)
    s = COBA.getDefaultStrPref("extensions.coba.official.filterlist", null);
  else
    s = Services.prefs.getCharPref("extensions.coba.official.filterlist", null);
  return (s ? s.split(" ") : []);
}

COBA.getPrefFilterList = function (def) {
  var s = "";
  if (def)
    s = COBA.getDefaultStrPref("extensions.coba.filterlist", null);
  else
    s = Services.prefs.getCharPref("extensions.coba.filterlist", null);
  return (s ? s.split(" ") : []);
}

COBA.addFilterRule = function (rule, enabled) {
  var idx = COBA.findRule(rule);
  var rules = document.getElementById('filterChilds');
  if (idx == -1) {
    var item = document.createElement('treeitem');
    var row = document.createElement('treerow');
    var c1 = document.createElement('treecell');
    var c2 = document.createElement('treecell');
    c1.setAttribute('label', rule);
    c2.setAttribute('value', enabled);
    row.appendChild(c1);
    row.appendChild(c2);
    item.appendChild(row);
    item.setEnabled = function(e){
      c2.setAttribute('value', e);
    }
    rules.appendChild(item);
    return (rules.childNodes.length - 1);
  }else{
    rules.childNodes[idx].setEnabled(enabled);
    return idx;
  }
}

COBA.addOfficialFilterRule = function (rule, enabled) {
  var rules = document.getElementById('filterChilds-official');
  var item = document.createElement('treeitem');
  var row = document.createElement('treerow');
  var c1 = document.createElement('treecell');
  var c2 = document.createElement('treecell');
  c1.setAttribute('label', rule);
  c2.setAttribute('value', enabled);
  row.appendChild(c1);
  row.appendChild(c2);
  item.appendChild(row);
  rules.appendChild(item);
  return (rules.childNodes.length - 1);
}
COBA.initFilterList = function (def) {
  var list = COBA.getPrefFilterList(def);
  var rules = document.getElementById('filterChilds');
  while (rules.hasChildNodes())
    rules.removeChild(rules.firstChild);
  for (var i = 0; i < list.length; i++) {
    if (list[i] != "") {
      var item = list[i].split("\b");
      var rule = item[0];
      var enabled = (item.length == 1);
      COBA.addFilterRule(rule, enabled);
    }
  }
}

COBA.initOfficialFilterList = function (def) {
  var list = COBA.getPrefOfficialFilterList(def);
  var rules = document.getElementById('filterChilds-official');
  while (rules.hasChildNodes())
    rules.removeChild(rules.firstChild);
  for (var i = 0; i < list.length; i++) {
    if (list[i] != "") {
      var item = list[i].split("\b");
      var rule = item[0];
      var enabled = (item.length == 1);
      COBA.addOfficialFilterRule(rule, enabled);
    }
  }
}

COBA.initDialog = function () {
  //filter tab 网址过滤
  document.getElementById('filtercbx').checked = Services.prefs.getBoolPref("extensions.coba.filter", true);
  //
  COBA.initFilterList(false);
  // add current tab's url
  var newurl = (window.arguments ? window.arguments[0] : ""); //get CurrentTab's URL
  document.getElementById('urlbox').value = (COBA.startsWith(newurl, "about:") ? "" : newurl);
  document.getElementById('urlbox').select();

  //official filter tab 网址过滤
  document.getElementById('filtercbx-official').checked = Services.prefs.getBoolPref("extensions.coba.official.filter", true);
  //official filter自动更新
  document.getElementById('autoUpdateFilter').checked = Services.prefs.getBoolPref("extensions.coba.official.filter.update", true);
  //
  COBA.initOfficialFilterList(false);


  //general 功能设置
//  document.getElementById('handleurl').checked = Services.prefs.getBoolPref("extensions.coba.handleUrlBar", false);
//  document.getElementById('runinprocess').checked = Services.prefs.getBoolPref("extensions.coba.runinprocess", false);

  //updateStatus
  COBA.updateFilterStatus();
  COBA.updateOfficialFilterStatus();
  COBA.updateApplyButton(false);
}

COBA.updateApplyButton = function (e) {
  document.getElementById("myApply").disabled = !e;
}

COBA.init = function () {
  COBA.initDialog();
  COBA.addEventListenerByTagName("checkbox", "command", COBA.updateApplyButton);

  COBA.filterObserver = new MutationObserver(function() {
    COBA.updateApplyButton(true);
  });

  var config = { attributes: true, childList: true, subtree:true};
  COBA.filterObserver.observe(document.getElementById('filterChilds'), config);
  COBA.filterObserver.observe(document.getElementById('filterChilds-official'), config);

  COBA.addEventListener("parambox", "input", COBA.updateApplyButton);
}

COBA.destory = function () {
  COBA.removeEventListenerByTagName("checkbox", "command", COBA.updateApplyButton);
  COBA.removeEventListenerByTagName("radio", "command", COBA.updateApplyButton);
  COBA.filterObserver.disconnect();
  COBA.removeEventListener("parambox", "input", COBA.updateApplyButton);
}

COBA.updateFilterStatus = function () {
  var en = document.getElementById('filtercbx').checked;
  document.getElementById('filterList').disabled = (!en);
  document.getElementById('filterList').editable = (en);
  document.getElementById('urllabel').disabled = (!en);
  document.getElementById('urlbox').disabled = (!en);
  COBA.updateAddButtonStatus();
  COBA.updateDelButtonStatus();
}

COBA.updateOfficialFilterStatus = function () {
  var en = document.getElementById('filtercbx-official').checked;
  document.getElementById('filterList-official').disabled = (!en);
  document.getElementById('filterList-official').editable = (en);
}

COBA.getFilterListString = function () {
  var list = [];
  var filter = document.getElementById('filterList');
  var count = filter.view.rowCount;

  for (var i = 0; i < count; i++) {
    var rule = filter.view.getCellText(i, filter.columns['columnRule']);
    var enabled = filter.view.getCellValue(i, filter.columns['columnEnabled']);
    var item = rule + (enabled == "true" ? "" : "\b");
    list.push(item);
  }
  list.sort();
  return list.join(" ");
}

COBA.getOfficialFilterListString = function () {
  var list = [];
  var filter = document.getElementById('filterList-official');
  var count = filter.view.rowCount;

  for (var i = 0; i < count; i++) {
    var rule = filter.view.getCellText(i, filter.columns['columnRule-official']);
    var enabled = filter.view.getCellValue(i, filter.columns['columnEnabled-official']);
    var item = rule + (enabled == "true" ? "" : "\b");
    list.push(item);
  }
  list.sort();
  return list.join(" ");
}

COBA.updateDelButtonStatus = function () {
  var en = document.getElementById('filtercbx').checked;
  var delbtn = document.getElementById('delbtn');
  var filter = document.getElementById('filterList');
  delbtn.disabled = (!en) || (filter.view.selection.count < 1);
}

COBA.updateAddButtonStatus = function () {
  var en = document.getElementById('filtercbx').checked;
  var addbtn = document.getElementById('addbtn');
  var urlbox = document.getElementById('urlbox');
  addbtn.disabled = (!en) || (urlbox.value.trim().length < 1);
}

COBA.findRule = function (value) {
  var filter = document.getElementById('filterList');
  var count = filter.view.rowCount;
  for (var i = 0; i < count; i++) {
    var rule = filter.view.getCellText(i, filter.columns['columnRule']);
    if (rule == value) return i;
  }
  return -1;
}

COBA.addNewURL = function () {
  var filter = document.getElementById('filterList');
  var urlbox = document.getElementById('urlbox');
  var rule = urlbox.value.trim();
  if (rule != "") {
    if ((rule != "about:blank") && (rule.indexOf("://") < 0)) {
      rule = (/^[A-Za-z]:/.test(rule) ? "file:///" + rule.replace(/\\/g, "/") : rule);
      if (/^file:\/\/.*/.test(rule)) rule = encodeURI(rule);
    }
    if (!/^\/(.*)\/$/.exec(rule)) rule = rule.replace(/\/$/, "/*");
    rule = rule.replace(/\s/g, "%20");
    var idx = COBA.addFilterRule(rule, true);
    urlbox.value = "";
    filter.view.selection.select(idx);
    filter.boxObject.ensureRowIsVisible(idx);
  }
  filter.focus();
  COBA.updateAddButtonStatus();
}
COBA.defaultFilter = function () {
  COBA.initFilterList(true);
}

COBA.delSelected = function () {
  var filter = document.getElementById('filterList');
  var rules = document.getElementById('filterChilds');
  if (filter.view.selection.count > 0) {
    for (var i = rules.childNodes.length - 1; i >= 0; i--) {
      if (filter.view.selection.isSelected(i)) rules.removeChild(rules.childNodes[i]);
    }
  }
  COBA.updateDelButtonStatus();
}

COBA.onClickFilterList = function (e) {
  var filter = document.getElementById('filterList');
  if (!filter.disabled && e.button == 0 && e.detail >= 2) {
    if (filter.view.selection.count == 1) {
      var urlbox = document.getElementById('urlbox');
      urlbox.value = filter.view.getCellText(filter.currentIndex, filter.columns['columnRule']);
      urlbox.select();
      COBA.updateAddButtonStatus();
    }
  }
}

COBA.onClickFilterListOfficial = function (e) {
}

COBA._saveToFile = function (aList) {
  var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  var stream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
  var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);

  fp.init(window, null, fp.modeSave);
  fp.defaultExtension = "txt";
  fp.defaultString = "COBAPref";
  fp.appendFilters(fp.filterText);

  if (fp.show() != fp.returnCancel) {
    try {
      if (fp.file.exists()) fp.file.remove(true);
      fp.file.create(fp.file.NORMAL_FILE_TYPE, 0666);
      stream.init(fp.file, 0x02, 0x200, null);
      converter.init(stream, "UTF-8", 0, 0x0000);

      for (var i = 0; i < aList.length; i++) {
        aList[i] = aList[i] + "\n";
        converter.writeString(aList[i]);
      }
    } finally {
      converter.close();
      stream.close();
    }
  }
}

COBA._loadFromFile = function () {
  var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  var stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
  var converter = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);

  fp.init(window, null, fp.modeOpen);
  fp.defaultExtension = "txt";
  fp.appendFilters(fp.filterText);

  if (fp.show() != fp.returnCancel) {
    try {
      var input = {};
      stream.init(fp.file, 0x01, 0444, null);
      converter.init(stream, "UTF-8", 0, 0x0000);
      converter.readString(stream.available(), input);
      var linebreak = input.value.match(/(((\n+)|(\r+))+)/m)[1];
      return [true, input.value.split(linebreak)];
    } finally {
      converter.close();
      stream.close();
    }
  }
  return [false, null];
}

COBA._getAllSettings = function (isDefault) {
  var prefix = "extensions.coba.";
  var branch = (isDefault ? Services.prefs.getDefaultBranch("") : Services.prefs.getBranch(""));
  var preflist = branch.getChildList(prefix, {});

  var aList = ["COBAPref"];
  for (var i = 0; i < preflist.length; i++) {
    try {
      var value = null;
      switch (branch.getPrefType(preflist[i])) {
      case Services.prefs.PREF_BOOL:
        value = branch.getBoolPref(preflist[i]);
        break;
      case Services.prefs.PREF_INT:
        value = branch.getIntPref(preflist[i]);
        break;
      case Services.prefs.PREF_STRING:
        value = branch.getComplexValue(preflist[i], Ci.nsISupportsString).data;
        break;
      }
      aList.push(preflist[i] + "=" + value);
    } catch (e) {ERROR(e)}
  }
  return aList;
}

COBA._setAllSettings = function (aList) {
  if (!aList) return;
  if (aList.length == 0) return;
  if (aList[0] != "COBAPref") return;

  var branch = Services.prefs.getBranch("");

  var aPrefs = [];
  for (var i = 1; i < aList.length; i++) {
    var index = aList[i].indexOf("=");
    if (index > 0) {
      var name = aList[i].substring(0, index);
      var value = aList[i].substring(index + 1, aList[i].length);
      aPrefs.push([name, value]);
    }
  }
  for (var i = 0; i < aPrefs.length; i++) {
    try {
      var name = aPrefs[i][0];
      var value = aPrefs[i][1];
      switch (branch.getPrefType(name)) {
      case Services.prefs.PREF_BOOL:
        branch.setBoolPref(name, /true/i.test(value));
        break;
      case Services.prefs.PREF_INT:
        branch.setIntPref(name, value);
        break;
      case Services.prefs.PREF_STRING:
        if (value.indexOf('"') == 0) value = value.substring(1, value.length - 1);
        var sString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
        sString.data = value;
        branch.setComplexValue(name, Ci.nsISupportsString, sString);
        break;
      }
    } catch (e) {ERROR(e)}
  }
}

COBA.removeDEP = function () {
  function getFileFromURLSpec(path) {
    var fph = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
    return fph.getFileFromURLSpec(path).QueryInterface(Ci.nsILocalFile);
  }
  AddonManager.getAddonByID("coba@mozilla.com.cn", function (addon) {
    try {
      // netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
      var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
      file.initWithPath(getFileFromURLSpec(addon.getResourceURI("").spec).path + "\\bin\\Dep.exe");
      var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
      process.init(file);
      var path = Services.dirsvc.get("XCurProcD", Ci.nsIFile);

      path.append("plugin-container.exe");
      process.run(false, [path.path], 1);
    } catch (e) {
      ERROR(e);
    }
  });
}
