// An event listener for custom "WebChannelMessageToChrome" events on pages
addEventListener("WebChannelMessageToChrome", function (e) {
  // if target is window then we want the document principal, otherwise fallback to target itself.
  let principal = e.target.nodePrincipal ? e.target.nodePrincipal : e.target.document.nodePrincipal;

  if (e.detail) {
    sendAsyncMessage("WebChannelMessageToChrome", e.detail, null, principal);
  } else  {
    Cu.reportError("WebChannel message failed. No message detail.");
  }
}, true, true);

// Add message listener for "WebChannelMessageToContent" messages from chrome scripts
addMessageListener("WebChannelMessageToContent", function (e) {
  if (e.data) {
    content.dispatchEvent(new content.CustomEvent("WebChannelMessageToContent", {
      detail: Cu.cloneInto({
        id: e.data.id,
        message: e.data.message,
      }, content),
    }));
  } else {
    Cu.reportError("WebChannel message failed. No message data.");
  }
});
