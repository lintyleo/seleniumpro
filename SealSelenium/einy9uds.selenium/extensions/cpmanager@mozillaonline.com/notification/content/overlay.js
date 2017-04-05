(function() {
	var init = function() {
		try {
			if (!!MOA.AN && MOA.AN.Lib.sinceFx4()) {
				Components.utils.import("resource://gre/modules/AddonManager.jsm");
				AddonManager.getAddonByID("addon-notification@mozillaonline.com", function(addon) {
					if (!addon)
						return;
					addon.uninstall();
				});
			} else {
				var em = Components.classes["@mozilla.org/extensions/manager;1"]
									.getService(Components.interfaces.nsIExtensionManager);
				em.uninstallItem("addon-notification@mozillaonline.com");
			}
		} catch (e) {}
	};
	window.addEventListener('load', init, false)
})();
