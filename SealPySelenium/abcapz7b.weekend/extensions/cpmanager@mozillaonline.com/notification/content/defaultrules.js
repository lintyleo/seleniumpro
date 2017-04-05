(function() {
	var ns = MOA.ns('AN.DefaultRules');

	var _rules_sincefx4 = {
		"reminders": [{
			"addon_id":"browser",
			"btn_id":"bookmarks-menu-button",
			"type":"tip",
			"times":1,
			"desc":"收藏网页？点这里！\u003Cbr /\u003E一键收藏当前网页，Ctrl+B则可打开书签侧栏、对已经收藏的网页进行整理\u003Cbr /\u003E",
			"url":""
		}, {
			"addon_id":"livemargins@mozillaonline.com",
			"btn_id":"appcenter-button",
			"type":"tip",
			"times":1,
			"desc":"火狐魔镜全新升级为火狐应用中心\u003Cbr /\u003E汇聚了众多实用工具、生活资讯、打折信息、音乐视频和网页游戏等网络应用，点击这里抢先体验吧\u003Cbr /\u003E",
			"url":""
		}, {
			"addon_id":"share_all_cn@mozillaonline.com",
			"btn_id":"share-all-cn-bar",
			"type":"tip",
			"times":1,
			"desc":"发微博，分享到QQ、人人？点这里！\u003Cbr /\u003E将网页链接或图片直接分享到QQ、人人或新浪微博，任何时候都可实现一键分享\u003Cbr /\u003E",
			"url":""
		}, {
			"addon_id":"livemargins@mozillaonline.com",
			"btn_id":"favpart-button",
			"type":"tip",
			"times":1,
			"desc":"剪下网页中喜欢的部分？点这里！\u003Cbr /\u003E新闻头条、股票走势、日程表、网页游戏、淘宝店铺。。。只有想不到，没有剪不到\u003Cbr /\u003E",
			"url":""
		}, {
			"addon_id":"quicklaunch@mozillaonline.com",
			"btn_id":"quickluanch-addonbar",
			"type":"tip",
			"times":1,
			"desc":"快捷调用？点这里！\u003Cbr /\u003E一键打开记事本、计算器、画图等系统程序，还有截图等常用操作\u003Cbr /\u003E",
			"url":""
		}, {
			"addon_id":"personas@christopher.beard",
			"btn_id":"personas-toolbar-button",
			"type":"tip",
			"times":1,
			"desc":"更换皮肤？点这里！\u003Cbr /\u003E立即给你的浏览器挑选皮肤，实时预览、一键生效\u003Cbr /\u003E",
			"url":""
		}, {
			"addon_id":"weibo@mozillaonline.com",
			"btn_id":"widget:weibo@mozillaonline.com-show-mozblogger-btn",
			"type":"tip",
			"times":1,
			"desc":"微博控？点这里！\u003Cbr /\u003E用火狐更方便的查看、发表、评论、转发新浪微博，并接收到更新通知。\u003Cbr /\u003E",
			"url":""
		}],
		"rules": [],
		"consts": {
			"max_daily_addon": 1,
			"later_wait_days": 3
		}
	};

	ns.VERSION = '0.7';
	ns.getDefaultRules = function() {
		return _rules_sincefx4
	};
})();
