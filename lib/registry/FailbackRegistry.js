/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/24
 * Time: 15:24
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
const _ = require('underscore');
const ring = require('ring');
const AbstractRegistry = require('./AbstractRegistry');
const Constants = require('../Constants');
const SkipFailbackWrapperException = require('../error/SkipFailbackWrapperException');
let FailbackRegistry = AbstractRegistry.$extend({
    retryFuture: null, //失败重试定时器，定时检查是否有请求失败，如有，无限次重试
    failedRegistered: new Set(),
    failedUnregistered: new Set(),
    failedSubscribed: new Map(),
    failedUnsubscribed: new Map(),
    failedNotified: new Map(),
    init(registryUrl) {
        this.$super.apply(this, arguments);
        let retryPeriod = registryUrl.parameters[Constants.REGISTRY_RETRY_PERIOD_KEY] || Constants.DEFAULT_REGISTRY_RETRY_PERIOD;
        this.retryFuture = setInterval(function() {
            // 检测并连接注册中心
            try {
                this.retry();
            } catch (e) { // 防御性容错
                if (this.logger)
                    this.logger.error("Unexpected error occur at failed retry, cause: ", e);
                else
                    console.error('Unexpected error occur at failed retry, cause: ', e.stack)
            }
        }.bind(this), retryPeriod);
    },
    register(url) {
        this.$super.register(url);
        this.failedRegistered.delete(url);
        this.failedUnregistered.delete(url);
        try {
            // 向服务器端发送注册请求
            this.doRegister(url);
        } catch (e) {
            // 如果开启了启动时检测，则直接抛出异常
            if (isCheckOrSkipFailback.call(this, url, e)) {
                throw e;
            } else {
                if (this.logger)
                    this.logger.error("Failed to register %s, waiting for retry, cause: ", url, e);
                else
                    console.error(util.format('Failed to register %s, waiting for retry, cause: ', url), e.stack);
            }

            // 将失败的注册请求记录到失败列表，定时重试
            this.failedRegistered.add(url);
        }
    },
    unregister(url) {
        this.$super.unregister(url);
        this.failedRegistered.delete(url);
        this.failedUnregistered.delete(url);
        try {
            // 向服务器端发送取消注册请求
            this.doUnregister(url);
        } catch (e) {
            // 如果开启了启动时检测，则直接抛出异常
            if (isCheckOrSkipFailback.call(this, url, e)) {
                throw e;
            } else {
                if (this.logger)
                    this.logger.error("Failed to unregister %s, waiting for retry, cause: ", url, e);
                else
                    console.error(util.format('Failed to unregister %s, waiting for retry, cause: ', url), e.stack);
            }

            // 将失败的取消注册请求记录到失败列表，定时重试
            this.failedUnregistered.add(url);
        }
    },
    subscribe(url, listener) {
        this.$super.subscribe(url, listener);
        removeFailedSubscribed.call(this, url, listener);
        try {
            // 向服务器端发送订阅请求
            this.doSubscribe(url, listener);
        } catch (e) {
            let urls = this.getCacheUrls(url);
            if (!_.isEmpty(urls)) {
                this.notify(url, listener, urls);
                if (this.logger)
                    this.logger.error("Failed to subscribe %s, Using cached list: %s from cache file: %s/dubbo-registry-%s.cache, cause: ", url, urls, this.registryUrl.parameters[Constants.FILE_KEY] || __dirname, url.host, e);
                else
                    console.error(util.format('Failed to subscribe %s, Using cached list: %s from cache file: %s/dubbo-registry-%s.cache, cause: ', url, urls, this.registryUrl.parameters[Constants.FILE_KEY] || __dirname, url.host), e.stack);
            } else {
                // 如果开启了启动时检测，则直接抛出异常
                if (isCheckOrSkipFailback.call(this, url, e)) {
                    throw e;
                } else {
                    if (this.logger)
                        this.logger.error("Failed to subscribe %s, waiting for retry, cause: ", url, e);
                    else
                        console.error(util.format('Failed to subscribe %s, waiting for retry, cause: ', url), e.stack);
                }
            }

            // 将失败的订阅请求记录到失败列表，定时重试
            addFailedSubscribed.call(this, url, listener);
        }
    },
    unsubscribe(url, listener) {
        this.$super.unsubscribe(url, listener);
        removeFailedSubscribed.call(this, url, listener);
        try {
            // 向服务器端发送取消订阅请求
            this.doUnsubscribe(url, listener);
        } catch (e) {
            // 如果开启了启动时检测，则直接抛出异常
            if (isCheckOrSkipFailback.call(this, url, e)) {
                throw e;
            } else {
                if (this.logger)
                    this.logger.error("Failed to unsubscribe %s, waiting for retry, cause: ", url, e);
                else
                    console.error(util.format('Failed to unsubscribe %s, waiting for retry, cause: ', url), e.stack);
            }

            // 将失败的取消订阅请求记录到失败列表，定时重试
            let listeners = this.failedUnsubscribed.get(url);
            if (listeners == null) {
                this.failedUnsubscribed.set(url, new Set());
                listeners = this.failedUnsubscribed.get(url);
            }
            listeners.add(listener);
        }
    },
    notify(url, listener, urls) {
        if (url == null) {
            throw new Error("notify url == null");
        }
        if (listener == null) {
            throw new Error("notify listener == null");
        }
        try {
            this.doNotify(url, listener, urls);
        } catch (e) {
            // 将失败的通知请求记录到失败列表，定时重试
            let listeners = this.failedNotified.get(url);
            if (listeners == null) {
                this.failedNotified.set(url, new Map());
                listeners = this.failedNotified.get(url);
            }
            listeners.set(listener, urls);
            if (this.logger)
                this.logger.error("Failed to notify for subscribe %s, waiting for retry, cause: ", url, e);
            else
                console.error(util.format('Failed to notify for subscribe %s, waiting for retry, cause: ', url), e.stack);
        }
    },
    doNotify(url, listener, urls) {
        ring.getSuper(FailbackRegistry, this, 'notify')(url, listener, urls);
    },
    recover() {
        // register
        if (this.registered.size > 0) {
            if (this.logger) {
                this.logger.info("Recover register url %s", [...this.registered]);
            }
            for (let url of this.registered.entries()) {
                this.failedRegistered.add(url);
            }
        }
        // subscribe
        if (this.subscribed.size > 0) {
            if (this.logger) {
                this.logger.info("Recover subscribe url %s", [...this.subscribed.keys()]);
            }
            for (let entry of this.subscribed.entries()) {
                let url = entry[0];
                for (let listener of entry[1].entries()) {
                    addFailedSubscribed.call(this, url, listener);
                }
            }
        }
    },
    retry() {
        function retryError(name, setOrMap, e) {
            if (this.logger)
                this.logger.error("Failed to retry %s %s, waiting for again, cause: ", name, [...setOrMap], e);
            else
                console.error(util.format('Failed to retry %s %s, waiting for again, cause: ', name, [...setOrMap]), e.stack);
        }
        function retDone(name, setOrMap, ret, fn) {
            if (ret && ring.instance(ret, Promise)) {
                ret.then(function() {
                    fn.call(this);
                }.bind(this), function(err) {
                    retryError.call(this, name, setOrMap, err);
                }.bind(this));
                return;
            }
            fn.call(this);
        }
        function retry(setOrMap, doFunction, done, name) {
            if (setOrMap && setOrMap.size > 0) {
                if (ring.instance(setOrMap, Map)) {
                    for (let entry of setOrMap.entries()) {
                        if (entry[1] == null || entry[1].size == 0) {
                            setOrMap.delete(entry[0]);
                        }
                    }
                }
                if (setOrMap.size > 0) {
                    if (this.logger) {
                        this.logger.info("Retry %s %s", name, [...setOrMap]);
                    }
                    for (let entry of setOrMap.entries()) {
                        try {
                            if (ring.instance(setOrMap, Set)) {
                                let ret = doFunction.call(this, entry);
                                retDone.call(this, name, setOrMap, ret, function() {
                                    done.call(this, entry);
                                });
                            } else if (ring.instance(setOrMap, Map)) {
                                let url = entry[0];
                                let listeners = entry[1];
                                for (let listener of listeners.entries()) {
                                    try {
                                        let ret = doFunction.call(this, entry, url, listener);
                                        retDone.call(this, name, setOrMap, ret, function() {
                                            done.call(this, entry, url, listener);
                                        });
                                    } catch (e) { // 忽略所有异常，等待下次重试
                                        retryError.call(this, name, setOrMap, e);
                                    }
                                }
                            }
                        } catch (e) { // 忽略所有异常，等待下次重试
                            retryError.call(this, name, setOrMap, e);
                        }
                    }
                }
            }
        }
        retry.call(this, this.failedRegistered, function(entry) {
            return this.doRegister(entry);
        }, function(entry) {
            this.failedRegistered.delete(entry);
        }, 'register');

        retry.call(this, this.failedUnregistered, function(entry) {
            return this.doUnregister(entry);
        }, function(entry) {
            this.failedUnregistered.delete(entry);
        }, 'unregister');

        retry.call(this, this.failedSubscribed, function(entry, url, listener) {
            return this.doSubscribe(url, listener);
        }, function(entry, url, listener) {
            entry[1].delete(listener);
        }, 'subscribe');

        retry.call(this, this.failedUnsubscribed, function(entry, url, listener) {
            return this.doUnsubscribe(url, listener);
        }, function(entry, url, listener) {
            entry[1].delete(listener);
        }, 'unsubscribe');

        retry.call(this, this.failedNotified, function(entry, url, listener) {
            return listener[0].notify(listener[1]);
        }, function(entry, url, listener) {
            entry[1].delete(listener[0]);
        }, 'notify');
    },
    doRegister(url) {
        throw new ReferenceError('Please implement the method.');
    },
    doUnregister(url) {
        throw new ReferenceError('Please implement the method.');
    },
    doSubscribe(url, listener) {
        throw new ReferenceError('Please implement the method.');
    },
    doUnsubscribe(url, listener) {
        throw new ReferenceError('Please implement the method.');
    },
    destroy() {
        this.$super.destroy();
        clearInterval(this.retryFuture);
    }
});
function addFailedSubscribed(url, listener) {
    let listeners = this.failedSubscribed.get(url);
    if (listeners == null) {
        this.failedSubscribed.set(url, new Set());
        listeners = this.failedSubscribed.get(url);
    }
    listeners.add(listener);
}

function removeFailedSubscribed(url, listener) {
    let listeners = this.failedSubscribed.get(url);
    if (listeners != null) {
        listeners.delete(listener);
    }
    listeners = this.failedUnsubscribed.get(url);
    if (listeners != null) {
        listeners.delete(listener);
    }
    let notified = this.failedNotified.get(url);
    if (notified != null) {
        notified.delete(listener);
    }
}
function check(url) {
    let checkKey = this.registryUrl.parameters[Constants.CHECK_KEY];
    let checkKey2 = url.parameters[Constants.CHECK_KEY];
    return Boolean(_.isUndefined(checkKey) ? true : checkKey)
        && Boolean(_.isUndefined(checkKey2) ? true : checkKey)
        && !Constants.CONSUMER_PROTOCOL == url.protocol;
}
function isCheckOrSkipFailback(url, e) {
    let check = check.call(this, url);
    let skipFailback = ring.instance(e, SkipFailbackWrapperException);
    return check || skipFailback;
}
module.exports = FailbackRegistry;