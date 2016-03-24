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
const dns = require('dns');
const querystring = require('querystring');
const ring = require('ring');
const _ = require('underscore');
const co = require('co');
const thunkify = require('thunkify');
const Constants = require('../Constants');
let URL = ring.create({
    protocol: null,
    username: null,
    password: null,
    host: null,
    port: null,
    path: null,
    parameters: null,
    full: null,
    ip: null,
    string: null,
    init() {
        if (arguments.length > 0) {
            if (_.isString(arguments[0])) {
                URL.valueOf(arguments[0], this);
            } else {
                this.valueOfProp(arguments[0]);
            }
        }
    },
    valueOfProp(prop) {
        if (prop) {
            for (let key in prop) {
                if (prop.hasOwnProperty(key))
                    this[key] = prop[key];
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
    isAnyHost() {
        return Constants.ANYHOST_VALUE === this.host || Boolean(this.parameters(Constants.ANYHOST_KEY));
    },
    getServiceInterface() {
        return this.parameters[Constants.INTERFACE_KEY] || this.path;
    },
    toFullString() {
        if (!this.full) {
            this.full = this.buildString(true, true, false, false);
        }
        return this.full;
    },
    buildString(appendUser, appendParameter, useIP, useService, parameters) {
        if (!useIP) {
            let buf = '';
            if (!_.isEmpty(this.protocol)) {
                buf += this.protocol;
                buf += '://';
            }
            if (appendUser && !_.isEmpty(this.username)) {
                buf += this.username;
                if (!_.isEmpty(this.password)) {
                    buf += ':';
                    buf += this.password;
                }
                buf.append("@");
            }
            let host = this.host;
            if(!_.isEmpty(host)) {
                buf += host;
                if (this.port > 0) {
                    buf += ':';
                    buf += this.port;
                }
            }
            let path;
            if (useService) {
                path = this.getServiceKey();
            } else {
                path = this.path;
            }
            if (!_.isEmpty(path)) {
                buf += '/';
                buf += path;
            }
            if (appendParameter) {
                buf = this.buildParameters(buf, true, parameters);
            }
            return buf;
        }
        return co(function * () {
            let buf = '';
            if (!_.isEmpty(this.protocol)) {
                buf += this.protocol;
                buf += '://';
            }
            if (appendUser && !_.isEmpty(this.username)) {
                buf += this.username;
                if (!_.isEmpty(this.password)) {
                    buf += ':';
                    buf += this.password;
                }
                buf.append("@");
            }
            let host;
            if (useIP) {
                host = yield this.getIp();
            } else {
                host = this.host;
            }
            if(!_.isEmpty(host)) {
                buf += host;
                if (this.port > 0) {
                    buf += ':';
                    buf += this.port;
                }
            }
            let path;
            if (useService) {
                path = this.getServiceKey();
            } else {
                path = this.path;
            }
            if (!_.isEmpty(path)) {
                buf += '/';
                buf += path;
            }
            if (appendParameter) {
                buf = this.buildParameters(buf, true, parameters);
            }
            return buf;
        }.bind(this));
    },
    getIp(){
        return co(function * () {
            if (!this.ip) {
                this.ip = (yield thunkify(dns.lookup)(this.host))[0];
            }
            return this.ip;
        }.bind(this));
    },
    getServiceKey() {
        let inf = this.getServiceInterface();
        if (inf == null) return null;
        let buf = '';
        let group = this.parameters[Constants.GROUP_KEY];
        if (!_.isEmpty(group)) {
            buf += group + '/';
        }
        buf += inf;
        let version = this.parameters[Constants.VERSION_KEY];
        if (!_.isEmpty(version)) {
            buf += ':' + version;
        }
        return buf;
    },
    buildParameters(buf, concat, parameters) {
        if (this.parameters) {
            let includes = (parameters == null || parameters.length == 0 ? null : parameters);
            let first = true;
            for (let key in this.parameters) {
                if (this.parameters.hasOwnProperty(key) && !_.isEmpty(key) && (includes == null || includes.indexOf(key) != -1)) {
                    if (first) {
                        if (concat) {
                            buf += '?';
                        }
                        first = false;
                    } else {
                        buf += '&';
                    }
                    buf += key;
                    buf += '=';
                    buf += this.parameters[key] == null ? "" : this.parameters[key].trim();
                }
            }
        }
        return buf;
    },
    toString() {
        if (!this.string) {
            this.string = this.buildString(false, true, false, false);
        }
        return this.string;
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
        parameters = querystring.parse(url.substring(i + 1));
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
    let prop = {
        protocol: protocol,
        username: username,
        password: password,
        host: host,
        port: port,
        path: path,
        parameters: parameters
    };
    if (ring.instance(self, URL)) {
        return self.valueOfProp(prop);
    }
    return new URL(prop);
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