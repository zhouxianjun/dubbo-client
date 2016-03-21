/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/21
 * Time: 16:59
 *                 _ooOoo_
 *                o8888888o
 *                88" . "88
 *                (| -_- |)
 *                O\  =  /O
 *             ____/`---'\____
 *           .'  \\|     |//  `.
 *           /  \\|||  :  |||//  \
 *           /  _||||| -:- |||||-  \
 *           |   | \\\  -  /// |   |
 *           | \_|  ''\---/''  |   |
 *           \  .-\__  `-`  ___/-. /
 *         ___`. .'  /--.--\  `. . __
 *      ."" '<  `.___\_<|>_/___.'  >'"".
 *     | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *     \  \ `-.   \_ __\ /__ _/   .-` /  /
 *======`-.____`-.___\_____/___.-`____.-'======
 *                   `=---='
 *^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *           佛祖保佑       永无BUG
 */
'use strict';
const ring = require('ring');
const _ = require('underscore');
const querystring = require('querystring');
const Constants = require('../Constants');
let URL = ring.create({
    protocol: null,
    username: null,
    password: null,
    host: null,
    port: null,
    path: null,
    parameters: null,
    init() {
        if (arguments.length > 0) {
            if (_.isString(arguments[0]) && arguments.length == 1) {
                URL.valueOf(arguments[0]);
            } else {
                this.valueOfProp.apply(this, arguments);
            }
        }
    },
    valueOfProp() {
        if (arguments.length) {
            let i = 0;
            for (let key in this) {
                if (this.hasOwnProperty(key))
                    this[key] = arguments[i++];
            }
        }
        return this;
    },
    setAddress(address) {
        let i = address.lastIndexOf(':');
        let host;
        let port = this.port;
        if (i >= 0) {
            host = address.substring(0, i);
            port = parseInt(address.substring(i + 1));
        } else {
            host = address;
        }
        return _.extend(_.clone(this), {
            host: host,
            port: port
        });
    },
    getBackupUrls() {
        let urls = [this];
        let backup = this.parameters[Constants.BACKUP_KEY];
        if (backup) {
            let backups = backup.split(',');
            if (backups && backups.length > 0) {
                backups.forEach(function(item) {
                    urls.push(this.setAddress(item));
                }, this);
            }
        }
        return urls;
    },
    getAuthority() {
        if (!this.username && !this.password) {
            return null;
        }
        return (this.username == null ? "" : this.username) + ":" + (this.password == null ? "" : this.password);
    },
    getAddress() {
        return this.port <= 0 ? this.host : this.host + ":" + this.port;
    },
    getBackupAddress() {
        return this.getBackupAddressByPort(0);
    },
    getBackupAddressByPort(port) {
        let address = appendDefaultPort(getAddress(), port);
        let backup = this.parameters[Constants.BACKUP_KEY];
        if (backup) {
            let backups = backup.split(',');
            if (backups && backups.length > 0) {
                backups.forEach(function(item) {
                    address += ',';
                    address += appendDefaultPort(item, port);
                }, this);
            }
        }
        return address;
    },
    getAbsolutePath() {
        if (this.path != null && !this.path.startsWith("/")) {
            return "/" + this.path;
        }
        return this.path;
    },
    setProtocol(protocol) {
        return new URL(protocol, this.username, this.password, this.host, this.port, this.path, this.parameters);
    },
    setUsername(username) {
        return new URL(this.protocol, username, this.password, this.host, this.port, this.path, this.parameters);
    },
    setPassword(password) {
        return new URL(this.protocol, this.username, password, this.host, this.port, this.path, this.parameters);
    },
    setHost(host) {
        return new URL(this.protocol, this.username, this.password, host, this.port, this.path, this.parameters);
    },
    setPort(port) {
        return new URL(this.protocol, this.username, this.password, this.host, port, this.path, this.parameters);
    },
    setPath(path) {
        return new URL(this.protocol, this.username, this.password, this.host, this.port, path, this.parameters);
    },
    isAnyHost() {
        return Constants.ANYHOST_VALUE === this.host || Boolean(this.parameters(Constants.ANYHOST_KEY));
    },
    getServiceInterface() {
        return this.parameters[Constants.INTERFACE_KEY] || this.path;
    }
});
URL.valueOf = function(url, self) {
    if (url == null || (url = url.trim()).length == 0) {
        throw new Error("url == null");
    }
    let protocol = null;
    let username = null;
    let password = null;
    let host = null;
    let port = 0;
    let path = null;
    let parameters = null;
    let i = url.indexOf("?");
    if (i >= 0) {
        querystring.parse(url.substring(i + 1))
        url = url.substring(0, i);
    }
    i = url.indexOf("://");
    if (i >= 0) {
        if(i == 0) throw new Error("url missing protocol: \"" + url + "\"");
        protocol = url.substring(0, i);
        url = url.substring(i + 3);
    } else {
        // case: file:/path/to/file.txt
        i = url.indexOf(":/");
        if(i>=0) {
            if(i == 0) throw new Error("url missing protocol: \"" + url + "\"");
            protocol = url.substring(0, i);
            url = url.substring(i + 1);
        }
    }

    i = url.indexOf("/");
    if (i >= 0) {
        path = url.substring(i + 1);
        url = url.substring(0, i);
    }
    i = url.indexOf("@");
    if (i >= 0) {
        username = url.substring(0, i);
        let j = username.indexOf(":");
        if (j >= 0) {
            password = username.substring(j + 1);
            username = username.substring(0, j);
        }
        url = url.substring(i + 1);
    }
    i = url.indexOf(":");
    if (i >= 0 && i < url.length() - 1) {
        port = parseInt(url.substring(i + 1));
        url = url.substring(0, i);
    }
    if(url.length() > 0) host = url;
    if (ring.instance(self, URL)) {
        return self.valueOfProp(protocol, username, password, host, port, path, parameters);
    }
    return new URL(protocol, username, password, host, port, path, parameters);
};
function appendDefaultPort(address, defaultPort) {
    if (address != null && address.length > 0 && defaultPort > 0) {
        let i = address.indexOf(':');
        if (i < 0) {
            return address + ":" + defaultPort;
        } else if (parseInt(address.substring(i + 1)) == 0) {
            return address.substring(0, i + 1) + defaultPort;
        }
    }
    return address;
}
module.exports = URL;