(function() {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						.getService(Components.interfaces.nsIWindowMediator);
	var mrw = wm.getMostRecentWindow("navigator:browser");

	var init = function() {
		var ruleCount = mrw.MOA.AN.RuleCenter.getRulesAvailCount();
		var addonTreeView = {
			rowCount: ruleCount,
			getCellText: function(row, column) {
				var rule = mrw.MOA.AN.RuleCenter.getRuleAvailByIndex(row);
				var reminder = mrw.MOA.AN.RuleCenter.getReminderAvailById(rule.reminder_id);
				switch (column.id) {
					case 'ao-domain':
						return rule.domain;
					case 'ao-regexp':
						return rule.regexp;
					case 'ao-addon':
						return reminder.addon_name || reminder.plugin_name || reminder.title;
					case 'ao-desc':
						return reminder.desc;
					default:
						mrw.MOA.debug(column.id);
						return 'Unknown'
				}
			},
			setTree: function(treebox) { this.treebox = treebox; },
			isContainer: function(row) { return false; },
			isSeparator: function(row) { return false; },
			isSorted: function() { return false; },
			getLevel: function(row) { return 0; },
			getImageSrc: function(row, col) { return null; },
			getRowProperties: function(row, props) {},
			getCellProperties: function(row, col, props) {},
			getColumnProperties: function(colid, col, props) {}
		};
		document.getElementById('addon').view = addonTreeView;
	}
	document.getElementById('notifierpane').addEventListener('paneload', init, false);
})();
