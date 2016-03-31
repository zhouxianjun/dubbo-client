/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/22
 * Time: 8:33
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
const _ = require('underscore');
const Constants = require('../Constants');
const URL = require('../registry/URL.ring');
let UrlUtils = {
    isMatch(consumerUrl, providerUrl){
        let consumerInterface = consumerUrl.getServiceInterface();
        let providerInterface = providerUrl.getServiceInterface();
        if(!(Constants.ANY_VALUE === consumerInterface || consumerInterface == providerInterface)) return false;

        if (!this.isMatchCategory(providerUrl.parameters[Constants.CATEGORY_KEY] || Constants.DEFAULT_CATEGORY,
                consumerUrl.parameters[Constants.CATEGORY_KEY] || Constants.DEFAULT_CATEGORY)) {
            return false;
        }
        if (!URL.Boolean(providerUrl.parameters[Constants.ENABLED_KEY], true)
            && !Constants.ANY_VALUE == consumerUrl.parameters[Constants.ENABLED_KEY]) {
            return false;
        }

        let consumerGroup = consumerUrl.parameters[Constants.GROUP_KEY];
        let consumerVersion = consumerUrl.parameters[Constants.VERSION_KEY];
        let consumerClassifier = consumerUrl.parameters[Constants.CLASSIFIER_KEY] || Constants.ANY_VALUE;

        let providerGroup = providerUrl.parameters(Constants.GROUP_KEY);
        let providerVersion = providerUrl.parameters(Constants.VERSION_KEY);
        let providerClassifier = providerUrl.parameters(Constants.CLASSIFIER_KEY, Constants.ANY_VALUE);
        let consumerGroups = consumerGroup ? consumerGroup.split(',') : [];
        return (Constants.ANY_VALUE == consumerGroup || consumerGroup == providerGroup || consumerGroups.indexOf(providerGroup) != -1)
            && (Constants.ANY_VALUE == consumerVersion || consumerVersion == providerVersion)
            && (consumerClassifier == null || Constants.ANY_VALUE == consumerClassifier || consumerClassifier == providerClassifier);
    },
    isMatchCategory(category, categories) {
        if (_.isEmpty(categories)) {
            return Constants.DEFAULT_CATEGORY == category;
        } else if (categories.indexOf(Constants.ANY_VALUE) != -1) {
            return true;
        } else if (categories.indexOf(Constants.REMOVE_VALUE_PREFIX) != -1) {
            return !(categories.indexOf(Constants.REMOVE_VALUE_PREFIX + category) != -1);
        } else {
            return categories.indexOf(category) != -1;
        }
    },
    parseURLs(address, defaults) {
        if (address == null || address.length == 0) {
            return null;
        }
        let addresses = address.split(Constants.REGISTRY_SPLIT_PATTERN);
        if (addresses == null || addresses.length == 0) {
            return null; //here won't be empty
        }
        let registries = new Set();
        addresses.forEach(function(addr) {
            registries.add(this.parseURL(addr, defaults));
        }, this);
        return registries;
    },
    parseURL(address, defaults) {
        if (address == null || address.length == 0) {
            return null;
        }
        let url;
        if (address.indexOf("://") >= 0) {
            url = address;
        } else {
            let addresses = address.split(Constants.COMMA_SPLIT_PATTERN);
            url = addresses[0];
            if (addresses.length > 1) {
                let backup = '';
                for (let i = 1; i < addresses.length; i++) {
                    if (i > 1) {
                        backup += ',';
                    }
                    backup += addresses[i];
                }
                url += "?" + Constants.BACKUP_KEY + "=" + backup;
            }
        }
        let defaultProtocol = defaults == null ? null : defaults.protocol;
        if (defaultProtocol == null || defaultProtocol.length == 0) {
            defaultProtocol = "dubbo";
        }
        let defaultUsername = defaults == null ? null : defaults.username;
        let defaultPassword = defaults == null ? null : defaults.password;
        let defaultPort = parseInt(defaults == null ? null : defaults.port);
        let defaultPath = defaults == null ? null : defaults.path;
        if (defaults != null) {
            delete defaults.protocol;
            delete defaults.username;
            delete defaults.password;
            delete defaults.host;
            delete defaults.port;
            delete defaults.path;
        }
        let u = URL.valueOf(url);
        if (_.isEmpty(u.protocol) && !_.isEmpty(defaultProtocol)) {
            u.protocol = defaultProtocol;
        }
        if (_.isEmpty(u.username) && !_.isEmpty(defaultUsername)) {
            u.username = defaultUsername;
        }
        if (_.isEmpty(u.password) && !_.isEmpty(defaultPassword)) {
            u.password = defaultPassword;
        }
        if (u.port <= 0) {
            if (defaultPort > 0) {
                u.port = defaultPort;
            } else {
                u.port = 9090;
            }
        }
        if (_.isEmpty(u.path) && !_.isEmpty(defaultPath)) {
            u.path = defaultPath;
        }
        if (defaults != null) {
            for (let key in defaults) {
                if (defaults.hasOwnProperty(key) && !_.isEmpty(defaults[key])) {
                    let value = u.parameters[key];
                    if (_.isEmpty(value)) {
                        u.parameters[key] = defaults[key];
                    }
                }
            }
        }
        return u;
    }
};
module.exports = UrlUtils;