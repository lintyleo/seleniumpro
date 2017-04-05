var EXPORTED_SYMBOLS = ['QuickDialData'];

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "NetUtil",
  "resource://gre/modules/NetUtil.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "FileUtils",
  "resource://gre/modules/FileUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "getPref",
  "resource://ntab/mozCNUtils.jsm");
XPCOMUtils.defineLazyGetter(this, "gUnicodeConverter", function () {
  let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                    .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = 'utf8';
  return converter;
});

let LOG = function(m) Services.console.logStringMessage(m);

let QuickDialData = {
  get variant() {
    let fxChannel = getPref('app.chinaedition.channel', 'www.firefox.com.cn');
    let variant = {
      'firefox.mail.163.com': 'netease_mail',
      'firefox.yazuo': 'yazuo',
      'firefox.yazuo2': 'yazuo2'
    }[fxChannel];

    /*
     * For some users, this pref might be set as "master-i" in bug 999, this
     * should be reflected in the response to "variant.channel" event, so these
     * users' offlintab will continue to update default quickdial data from the
     * "master-i" endpoint.
     *
     * On the other side, QuickDialData.read will only be called in a fresh
     * profile, where "moa.ntab.dial.branch" pref no longer exists. As a result,
     * there's no "resource://ntab/quickdialdata/master-i.json" included.
     */
    let dialBranch = getPref('moa.ntab.dial.branch', 'master-ii');
    variant = variant || {
      'master-i': 'master-i'
    }[dialBranch];
    variant = variant || 'master-ii';

    delete this.variant;
    return this.variant = variant;
  },
  get _bundleFile() {
    let spec = 'resource://ntab/quickdialdata/' + this.variant + '.json';
    let uri = Services.io.newURI(spec, null, null);
    return uri.QueryInterface(Ci.nsIFileURL).file;
  },
  get _latestFile() {
    return FileUtils.getFile('ProfLD', ['ntab', 'quickdialdata',
                                        'latest.json'], false);
  },
  get _defaultData() {
    return this._loadData(this._latestFile, true) ||
           this._loadData(this._bundleFile, false);
  },

  get _userFile() {
    return FileUtils.getFile('ProfD', ['ntab', 'quickdialdata',
                                       'user.json'], false);
  },

  _loadData: function(aFile, aFindBackup) {
    let text = null;
    if (aFile.exists() && aFile.fileSize) {
      let fstream = Cc['@mozilla.org/network/file-input-stream;1'].
                      createInstance(Ci.nsIFileInputStream);
      fstream.init(aFile, -1, 0, 0);
      text = NetUtil.readInputStreamToString(fstream, fstream.available());
      fstream.close();
      text = gUnicodeConverter.ConvertToUnicode(text);
    }
    try {
      text = JSON.parse(text);
    } catch(e) {
      text = null;
      try {
        aFile.remove(false);
      } catch(e) {};
    }

    if (aFindBackup) {
      let backup = aFile.clone();
      backup.leafName += '.bak';
      if (text) {
        /*
         * Only backup after a successful reading,
         * to avoid creating corrupt backup by repeated writing.
         */
        try {
          if (backup.exists()) {
            backup.remove(false);
          }
          aFile.copyTo(null, backup.leafName);
        } catch(e) {
          Cu.reportError(e);
        }
      } else {
        text = this._loadData(backup, false);
        if (text) {
          try {
            backup.copyTo(null, aFile.leafName);
          } catch(e) {
            Cu.reportError(e);
          };
        }
      }
    }
    return text;
  },

  _legacyMigration: function(aItem) {
    switch(aItem.url) {
      case "http://click.mz.simba.taobao.com/rd?w=mmp4ptest&f=http%3A%2F%2Fwww.taobao.com%2Fgo%2Fchn%2Ftbk_channel%2Fonsale.php%3Fpid%3Dmm_28347190_2425761_9313996&k=e02915d8b8ad9603":
      case "http://click.mz.simba.taobao.com/rd?w=mmp4ptest&f=http%3A%2F%2Fwww.taobao.com%2Fgo%2Fchn%2Ftbk_channel%2Fonsale.php%3Fpid%3Dmm_28347190_2425761_9313997&k=e02915d8b8ad9603":
      case "http://redirect.simba.taobao.com/rd?c=un&w=channel&f=http%3A%2F%2Fwww.taobao.com%2Fgo%2Fchn%2Ftbk_channel%2Fonsale.php%3Fpid%3Dmm_28347190_2425761_9313997%26unid%3D&k=e02915d8b8ad9603&p=mm_28347190_2425761_9313997":
        aItem.url = "http://www.taobao.com/go/chn/tbk_channel/onsale.php?pid=mm_28347190_2425761_13466329&eventid=101329";
        break;
      case "http://click.union.360buy.com/JdClick/?unionId=206&siteId=8&to=http://www.360buy.com/":
      // remove item when counts per day < 10?
      // case "http://click.union.360buy.com/JdClick/?unionId=316&siteId=21946&to=http://www.360buy.com":
      case "http://click.union.360buy.com/JdClick/?unionId=20&siteId=433588__&to=http://www.360buy.com":
      case "http://www.yihaodian.com/?tracker_u=10977119545":
        if ((aItem.icon && aItem.icon.indexOf('chrome://') == 0) || aItem.rev) {
          aItem.url = "http://youxi.baidu.com/yxpm/pm.jsp?pid=11016500091_877110";
        }
        break;
      default:
        break;
    }

    delete aItem.icon;
    delete aItem.rev;
    delete aItem.thumbnail;

    return aItem;
  },
  _itemMigration: function(aItem) {
    switch(aItem.url) {
      case "http://count.chanet.com.cn/click.cgi?a=498315&d=365155&u=&e=&url=http%3A%2F%2Fwww.jd.com":
        aItem.url = "http://www.jd.com/";
        break;
      default:
        break;
    }

    return aItem;
  },
  _migrateUserData: function(aDefaultData) {
    let _legacyUserFile = FileUtils.getFile('ProfD',
                                            ['ntab', 'quickdial.json'], false);
    let legacyUserData = null;
    if (_legacyUserFile.exists() && !this._userFile.exists()) {
      try {
        let reverseLookup = {};
        for (let index in aDefaultData) {
          reverseLookup[aDefaultData[index].url] = index;
        }

        legacyUserData = this._loadData(_legacyUserFile, false);
        for (let index in legacyUserData) {
          let item = this._legacyMigration(legacyUserData[index]);
          legacyUserData[index] = reverseLookup[item.url] || item;
        }

        _legacyUserFile.remove(false);
      } catch(e) {
        LOG('Oops, migration failed: ' + e);
      }
    }
    return legacyUserData;
  },

  read: function() {
    let defaultData = this._defaultData;

    let userData = this._migrateUserData(defaultData) ||
                   this._loadData(this._userFile, true);

    let ret = {};
    if (userData) {
      for (let index in userData) {
        let item = userData[index];
        if (/^\d+$/.test(item)) {
          let defaultItem = defaultData[item];
          if (defaultItem) {
            defaultItem.defaultposition = item;
          }
          item = defaultItem;
        } else {
          item = this._itemMigration(item);
          userData[index] = item;
        }
        ret[index] = item;
      }
    } else {
      for (let index in defaultData) {
        let defaultItem = defaultData[index];
        defaultItem.defaultposition = index;
        ret[index] = defaultItem;
      }
    }
    return ret;
  }
};
