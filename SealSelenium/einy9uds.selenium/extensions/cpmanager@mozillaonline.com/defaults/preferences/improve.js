// In which folder do we bookmark the page:
// -1 last selected
// 1  the Places root
// 2  the bookmarks menu folder
// 3  the personal toolbar folder
// 4  the top-level folder that contain the tag "folders"
// 5  the unfiled-bookmarks folder
pref("extensions.cmimprove.bookmarks.parentFolder", -1);
pref("extensions.cmimprove.bookmarks.add.defaultFolder", 5);

// whether or not to show the edit-bookmark UI when adds a bookmark to the page
pref("extensions.cmimprove.bookmarks.add.showEditUI", true);

// features enable
pref("extensions.cmimprove.features.tabcontextmenu.enable", true);
pref("extensions.cmimprove.features.undocloseanimation.enable", true);

pref("extensions.cmimprove.gesture.enabled", true);

// number of days for auto clear history
// 0   =  disable auto clear
// -1  =  daily
// -2  =  weekly
// -3  =  monthly
// -4  =  querterly
// -6  =  yearly
pref("extensions.cpmanager@mozillaonline.com.sanitize.timeout", -4);

// whether to show url2qr icon in urlbar
pref("extensions.cmimprove.url2qr.enabled", true);

pref("security.tls.insecure_fallback_hosts", "bj.ac.10086.cn,dlsev.boc.cn,ebspay.boc.cn,wszg.nbcs.gov.cn,www.hx168.com.cn");
