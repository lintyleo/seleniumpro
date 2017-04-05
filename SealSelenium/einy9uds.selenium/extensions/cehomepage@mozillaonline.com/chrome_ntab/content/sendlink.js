(function() {
  var sendlink = MOA.ns('NTab.SendLink');

  function _str() {
    return '\n\n' + document.getElementById('ntab-strings').getString('ntab.contextmenu.sendlink.message');
  }

  sendlink.onMenuItemCommand = function(event) {
    var aWindow = window.content;
    MailIntegration.sendMessage(aWindow.location.href + _str(),
      aWindow.document.title);
  };

  sendlink.onContextItemCommand = function(event) {
    var aWindow = window.content;
    MailIntegration.sendMessage(gContextMenu.linkURL + _str(),
      gContextMenu.linkText());
  };
})();
