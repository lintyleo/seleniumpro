/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {
  var cmtracking_init = function() {
    var checkbox = document.getElementById("submitTrackingBox");
    checkbox.checked = Application.prefs.getValue("extensions.cpmanager.tracking.enabled", false);
    gAdvancedPane._setupLearnMoreLink("extensions.cpmanager.tracking.infoURL", "trackingLearnMore");
  }
  var _init = gAdvancedPane.init.bind(gAdvancedPane);
  gAdvancedPane.init = (function() {
    _init();
    cmtracking_init();
  }).bind(gAdvancedPane);
})();

