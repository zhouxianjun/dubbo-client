/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/28
 * Time: 11:26
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
const querystring = require('querystring');
const Constants = require('../Constants');
const UrlUtils = require('./UrlUtils');
const URL = require('../registry/URL.ring.js');
let ReferenceUtils = {
    createProxy(map) {
        let us = this.loadRegistries(false);
        if (us && us.size > 0) {
            for (let u of us.values()) {
                u.parameters[Constants.REFER_KEY] = querystring.stringify(map);
            }


        }
    },
    refer(service, url, protocol) {
        if (Constants.REGISTRY_PROTOCOL == url.protocol) {
            url.protocol = url.parameters[Constants.REGISTRY_KEY] || Constants.DEFAULT_REGISTRY;
            delete url.parameters[Constants.REGISTRY_KEY];
            let registry = registryFactory.getRegistry(url);

            // group="a,b" or group="*"
            let qs = querystring.parse(url.parameters[Constants.REFER_KEY]);
            let group = qs[Constants.GROUP_KEY];
            if (!_.isEmpty(group)) {
                let gs = group.split(Constants.COMMA_SPLIT_PATTERN);
                if (gs.length > 1 || "*" == group) {
                    return doRefer( getMergeableCluster(), registry, type, url );
                }
            }
            return doRefer(cluster, registry, type, url);
            return protocol.refer(service, url);
        }
    },
    loadRegistries(provider) {
        function load(registry, list) {
            let map = {
                application: config.application.name,
                path: 'com.alibaba.dubbo.registry.RegistryService',
                dubbo: config.version,
                protocol: registry.protocol
            };
            map[Constants.TIMESTAMP_KEY] = String(new Date().getTime());
            map[Constants.PID_KEY] = String(process.pid);
            if (_.isUndefined(map.protocol)) {
                map.protocol = 'dubbo';
            }
            let urls = UrlUtils.parseURLs(registry.address, map);
            for (let url of urls.values()) {
                url.parameters[Constants.REGISTRY_KEY] = url.protocol;
                url.protocol = Constants.REGISTRY_PROTOCOL;
                if ((provider && URL.Boolean(url.parameters[Constants.REGISTER_KEY], true))
                    || (!provider && URL.Boolean(url.parameters[Constants.SUBSCRIBE_KEY], true))) {
                    list.add(url);
                }
            }
        }
        let config = require(process.cwd() + '/dubbo');
        let registrys = config.registry;
        let list = new Set();
        if (_.isArray(registrys)) {
            registrys.forEach(function(registry) {
                load(registry, list);
            }, this);
            return list;
        }
        load(registrys, list);
        return list;
    }
};
module.exports = ReferenceUtils;