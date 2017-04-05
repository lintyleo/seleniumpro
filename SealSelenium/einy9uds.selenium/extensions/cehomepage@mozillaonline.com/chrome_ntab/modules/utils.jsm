var EXPORTED_SYMBOLS = ['utils'];

var Cc = Components.classes;
var Ci = Components.interfaces;

// file should be an array, e.g.: [dir1, dir2, dir3, filename].
function _getFile(file_att) {
	if (typeof file_att.shift != 'function' || file_att.length == 0)
		return null;

	var file = Cc['@mozilla.org/file/directory_service;1']
		.getService(Ci.nsIProperties).get('ProfD', Ci.nsIFile);

	// create directory
	var dir_name = file_att.shift();
	while (file_att.length > 0) {
		file.append(dir_name);
		if (!file.exists() || !file.isDirectory()) {
			return null;
		}

		dir_name = file_att.shift();
	}

	file.append(dir_name);
	if (!file.exists()) {
		return null;
	}

	return file;
}

function _getCreateFile(file_att) {
	if (typeof file_att.shift != 'function' || file_att.length == 0)
			return null;

	var file = Cc['@mozilla.org/file/directory_service;1']
		.getService(Ci.nsIProperties).get('ProfD', Ci.nsIFile);

	// create directory
	var dir_name = file_att.shift();
	while (file_att.length > 0) {
		file.append(dir_name);
		if (!file.exists() || !file.isDirectory()) {
			file.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
		}

		dir_name = file_att.shift();
	}

	// create file
	file.append(dir_name);
	if (!file.exists()) {
		file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);
	}

	return file;
}
function _readStringFromFile(file) {
	var data = '';
	var fstream = Cc['@mozilla.org/network/file-input-stream;1']
		.createInstance(Ci.nsIFileInputStream);
	var cstream = Cc['@mozilla.org/intl/converter-input-stream;1']
		.createInstance(Ci.nsIConverterInputStream);

	try {
		fstream.init(file, -1, 0, 0);
		cstream.init(fstream, 'UTF-8', 0, 0);

		var str = {};
		var read = 0;
		do {
			read = cstream.readString(0xffffffff, str);	// read as much as we can and  put it in str.value
			data += str.value;
		} while (read != 0);
	} catch(err) {
		MOA.log('Error occured when reading addon-notification/rules.json : ' + err);
	} finally {
		if (cstream) {
			try {
				cstream.close();
			} catch (err) {
				MOA.log('Error occured when closing reading addon-notification/rules.json : ' + err);
			}
		}
	}

	return data;
}

function _setStringToFile(file, json) {
	var foStream = Cc['@mozilla.org/network/file-output-stream;1']
		.createInstance(Ci.nsIFileOutputStream);

	foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

	var converter = Cc['@mozilla.org/intl/converter-output-stream;1']
		.createInstance(Ci.nsIConverterOutputStream);

	try {
		converter.init(foStream, 'UTF-8', 0, 0);
		converter.writeString(json);
	} catch(err) {
		MOA.log('Error occured when writing addon-notification/rules.json : ' + err);
	} finally {
		if (converter) {
			try {
				converter.close();
			} catch (err) {
				MOA.log('Error occured when closing writing addon-notification/rules.json : ' + err);
			}
		}
	}
}
var utils = {
	readStrFromProFile: function(file_att) {
		var file = _getFile(file_att)
		if (!file)
			return '';
		return _readStringFromFile(file);
	},

	setStrToProFile: function(file_att, json) {
		var file = _getCreateFile(file_att);
		if (!file)
			return;
		_setStringToFile(file, json);
	},

	readStrFromFile: function(file) {
		if (!file)
			return '';
		return _readStringFromFile(file);
	},

	setStrToFile: function(file, json) {
		if (!file)
			return;
		_setStringToFile(file, json);
	},

	// save uri to profile file asynchronously, so 'callback' is necessary.
	saveURIToProFile: function(file_att, uri, callback) {
		if (!uri)
			return;

		var file = _getCreateFile(file_att);
		if (!file)
			return;

		var persist = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
						.createInstance(Ci.nsIWebBrowserPersist);
		persist.persistFlags = 	Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
								Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

		if (typeof callback == 'function') {
			persist.progressListener = {
				onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
				},

				onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
					if (aFlag & Ci.nsIWebProgressListener.STATE_STOP) {
						callback();
					}
				}
			};
		}

		persist.saveURI(uri, null, null, null, null, file, null);
	},

	fileExists: function(file_att) {
		return !!_getFile(file_att);
	},

	getProFile: function(file_att) {
		return _getFile(file_att);
	},

	removeFile: function(file_att) {
		var file = _getFile(file_att);
		if (!file)
			return;

		try {
			file.remove(false);
		} catch (e) {
			dump('Error occurs when removing file "' + file_att.join('/') + '"' + e);
		}
	},

	md5: function(string) {
		if (!string)
			return;

		// Build array of character codes to MD5
		var array = [];
		for (var i = 0; i < string.length; i++) {
			array.push(string.charCodeAt(i));
		}

		var hash = Cc['@mozilla.org/security/hash;1'].createInstance(Ci.nsICryptoHash);
		hash.init(hash.MD5);
		hash.update(array, array.length);
		var binary = hash.finish(false);

		// Unpach the binary data bin2hex style
		var result = [];
		for (var i = 0; i < binary.length; i++) {
			var c = binary.charCodeAt(i);
			var ones = c % 16;
			var tens = c >> 4;
			result.push(String.fromCharCode(tens + (tens > 9 ? 87 : 48)) +
					  String.fromCharCode(ones + (ones > 9 ? 87 : 48)));
		}

		return result.join('');
	}
}
