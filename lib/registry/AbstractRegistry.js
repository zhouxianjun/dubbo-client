/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/21
 * Time: 13:48
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
const util = require('util');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const _ = require('underscore');
const Q = require('q');
const Constants = require('../Constants');
const UrlUtils = require('../util/UrlUtils');
const URL = require('./URL');
const NotifyListener = require('./NotifyListener');
const RegistryService = require('./RegistryService');
const thunkify = require('thunkify');
const co = require('co');
let AbstractRegistry = RegistryService.$extend({
    logger: null, //日志输出
    URL_SEPARATOR: ' ', //URL地址分隔符，用于文件缓存中，服务提供者URL分隔
    URL_SPLIT: /\s+/, //URL地址分隔正则表达式，用于解析文件缓存中服务提供者URL列表
    registryUrl: null,
    subscribed: new Map(),
    notified: new Map(),
    registered: new Set(),
    file: null,
    properties: null,
    init(registryUrl){
        this.registryUrl = registryUrl;
        console.log(this.registryUrl);
        this.file = (this.registryUrl.parameters[this.FILE_KEY] || __dirname) + '/.dubbo/dubbo-registry-' + this.registryUrl.host + '.cache';
        if (!_.isEmpty()) {
            if (!fs.existsSync(this.file) && !fs.existsSync(path.dirname(this.file))){
                if (!fs.mkdirSync(this.file)){
                    throw new Error("Invalid registry store file " + file + ", cause: Failed to create directory " + path.dirname(this.file) + "!");
                }
            }
        }
        this.loadProperties();
        this.notifyUrls(registryUrl.getBackupUrls());
    },
    notifyUrls(urls){
        if (!urls || urls.length <= 0) return;
        for (let item of this.subscribed.entries()) {
            let url = item[0];
            if(!UrlUtils.isMatch(url, urls[0])) {
                continue;
            }
            let listeners = item[1];
            if (listeners) {
                for (let listener of listeners.entries() ){
                    try {
                       this.notify(url, listener, this.filterEmpty(url, urls));
                    } catch (err) {
                        if (this.logger)
                            this.logger.error('Failed to notify registry event, urls: %s, cause: %s', urls, err.message, err);
                        else
                            console.error(util.format('Failed to notify registry event, urls: %s, cause: %s', urls, err.message), err.stack);
                    }
                }
            }
        }
    },
    notify(url, listener, urls) {
        if (url == null) {
            throw new Error("notify url == null");
        }
        if (listener == null) {
            throw new Error("notify listener == null");
        }
        if ((urls == null || urls.length == 0)
            && ! Constants.ANY_VALUE == url.getServiceInterface()) {
            this.logger && this.logger.warn("Ignore empty notify urls for subscribe url %s", url);
            return;
        }
        if (this.logger) {
            this.logger.info("Notify urls for subscribe url %s, urls: %s", url, urls);
        }
        let result = new Map();
        urls.forEach(function(u) {
            if (UrlUtils.isMatch(url, u)) {
                let category = u.parameters[Constants.CATEGORY_KEY] || Constants.DEFAULT_CATEGORY;
                let categoryList = result.get(category);
                if (categoryList == null) {
                    categoryList = [];
                    result.set(category, categoryList);
                }
                categoryList.add(u);
            }
        });
        if (result.size == 0) {
            return;
        }
        let categoryNotified = this.notified.get(url);
        if (categoryNotified == null) {
            this.notified.has(url) || this.notified.set(url, new Map());
            categoryNotified = this.notified.get(url);
        }
        for (let item of result.entries()) {
            let category = item[0];
            let categoryList = item[1];
            categoryNotified.set(category, categoryList);
            this.saveProperties(url);
            listener.notify(categoryList);
        }
    },
    filterEmpty(url, urls) {
        if (urls == null || urls.length == 0) {
            return [url.setProtocol(Constants.EMPTY_PROTOCOL)];
        }
        return urls;
    },
    loadProperties() {
        if (this.file && fs.existsSync(this.file)) {
            try {
                let result = fs.readFileSync(this.file, {encoding: 'utf8'});
                this.logger && this.logger.info("Load registry store file " + file + ", data: " + result);
                this.properties = JSON.parse(result);
            } catch (err) {
                if (this.logger)
                    this.logger.warn('Failed to load registry store file %s', file, err);
                else
                    console.error(util.format('Failed to load registry store file %s', file), err.stack);
            }
        }
    },
    saveProperties(url) {
        if (!this.file) {
            return;
        }

        co(function * () {
            let buf = '';
            let categoryNotified = this.notified.get(url);
            if (categoryNotified != null) {
                for (let us of categoryNotified.values()) {
                    us.forEach(function(u) {
                        if (buf.length > 0) {
                            buf += this.URL_SEPARATOR;
                        }
                        buf += yield u.toFullString();
                    }, this);
                }
            }
            this.properties[url.getServiceKey()] = buf;
            yield thunkify(fs.writeFile)(this.file, JSON.stringify(this.properties), {encoding: 'utf8'})
        }.bind(this));
    },
    getCacheUrls(url) {
        for (let key in this.properties) {
            if (this.properties.hasOwnProperty(key)) {
                let value = this.properties[key];
                if (!_.isEmpty(key) && key == url.getServiceKey() && (/^[A-Za-z]+$/.test(key[0]) || key[0] == '_') &&
                    !_.isEmpty(value)) {
                    let arr = value.trim().split(this.URL_SPLIT);
                    let urls = [];
                    arr.forEach(function(u) {
                        urls.push(URL.valueOf(u));
                    });
                    return urls;
                }
            }
        }

        return null;
    },
    lookup(url) {
        let result = [];
        let deferred = Q.defer();
        let notifiedUrls = this.notified.get(url);
        function forPushUrls(urls) {
            urls.forEach(function(u) {
                if (!Constants.EMPTY_PROTOCOL == u.protocol) {
                    result.push(u);
                }
            });
        }
        if (!_.isEmpty(notifiedUrls)) {
            for (let urls of notifiedUrls.values()) {
                forPushUrls(urls);
            }
            deferred.resolve(result);
        } else {
            this.subscribe(url, new NotifyListener(function(urls) {
                if (!_.isEmpty(urls)) {
                    forPushUrls(urls);
                }
                deferred.resolve(result);
            })); // 订阅逻辑保证第一次notify后再返回
        }
        return deferred.promise;
    },
    subscribe(url, listener) {
        if (url == null) {
            throw new Error("subscribe url == null");
        }
        if (listener == null) {
            throw new Error("subscribe listener == null");
        }
        if (this.logger) {
            this.logger.info("Subscribe: %s", url);
        }
        let listeners = this.subscribed.get(url);
        if (listeners == null) {
            this.subscribed.set(url, new Set());
            listeners = this.subscribed.get(url);
        }
        listeners.add(listener);
    },
    register(url) {
        if (url == null) {
            throw new Error("register url == null");
        }
        if (this.logger) {
            this.logger.info("Register: %s", url);
        }
        this.registered.add(url);
    },
    unregister(url) {
        if (url == null) {
            throw new Error("unregister url == null");
        }
        if (this.logger) {
            this.logger.info("Unregister: %s", url);
        }
        this.registered.delete(url);
    },
    unsubscribe(url, listener) {
        if (url == null) {
            throw new Error("unsubscribe url == null");
        }
        if (listener == null) {
            throw new Error("unsubscribe listener == null");
        }
        if (this.logger) {
            this.logger.info("Unsubscribe: %s", url);
        }
        let listeners = this.subscribed.get(url);
        if (listeners != null) {
            listeners.delete(listener);
        }
    },
    recover() {
        // register
        let recoverRegistered = new Set(this.registered);
        if (recoverRegistered.size > 0) {
            if (this.logger) {
                this.logger.info("Recover register url %s", recoverRegistered);
            }
            for (let url of recoverRegistered.entries()) {
                this.register(url);
            }
        }
        // subscribe
        let recoverSubscribed = new Map(this.subscribed);
        if (recoverSubscribed.size > 0) {
            if (this.logger) {
                this.logger.info("Recover subscribe url %s" + recoverSubscribed.keys());
            }
            for (let entry of recoverSubscribed.entries()) {
                for (let listener of entry[1].entries()) {
                    this.subscribe(entry[0], listener);
                }
            }
        }
    },
    destroy() {
        if (this.logger){
            this.logger.info("Destroy registry:%s", getUrl());
        }
        let destroyRegistered = new Set(this.registered);
        if (destroyRegistered.size > 0) {
            for (let url of destroyRegistered.entries()) {
                if (url.parameters[Constants.DYNAMIC_KEY] || true) {
                    try {
                        this.unregister(url);
                        if (this.logger) {
                            this.logger.info("Destroy unregister url %s", url);
                        }
                    } catch (e) {
                        if (this.logger)
                            this.logger.error("Failed to unregister url %s to registry %s on destroy, cause: ", url, this.registryUrl, e);
                        else
                            console.warn(util.format('Failed to unregister url %s to registry %s on destroy, cause: ', url, this.registryUrl), e.stack);
                    }
                }
            }
        }
        let destroySubscribed = new Map(this.subscribed);
        if (destroySubscribed.size > 0) {
            for (let entry of destroySubscribed.entries()) {
                let url = entry[0];
                for (let listener of entry[1].entries()) {
                    try {
                        this.unsubscribe(url, listener);
                        if (this.logger) {
                            this.logger.info("Destroy unsubscribe url %s", url);
                        }
                    } catch (e) {
                        if (this.logger)
                            this.logger.error("Failed to unsubscribe url %s to registry %s on destroy, cause: ", url, this.registryUrl, e);
                        else
                            console.warn(util.format('Failed to unsubscribe url %s to registry %s on destroy, cause: ', url, this.registryUrl), e.stack);
                    }
                }
            }
        }
    },
    toString() {
        return this.registryUrl.toString();
    }
});
module.exports = AbstractRegistry;