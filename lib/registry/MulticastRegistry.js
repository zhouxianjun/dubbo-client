/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/25
 * Time: 13:36
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
const FailbackRegistry = require('./FailbackRegistry');
const Constants = require('../Constants');
const URL = require('./URL');
const SkipFailbackWrapperException = require('../error/SkipFailbackWrapperException');
const UrlUtils = require('../util/UrlUtils.js');
const co = require('co');
const thunkify = require('thunkify');
const dns = require('dns');
const dgram = require('dgram');
let MulticastRegistry = FailbackRegistry.$extend({
    mutilcastAddress: null,
    mutilcastSocket: null,
    mutilcastPort: null,
    received: new Map(),
    admin: false,
    cleanPeriod: null,
    init(registryUrl) {
        this.$super.apply(this, arguments);
        if (registryUrl.isAnyHost()) {
            throw new Error("registry address == null");
        }
        if (!isMulticastAddress(registryUrl.host)) {
            throw new Error("Invalid multicast address " + registryUrl.host + ", scope: 224.0.0.0 - 239.255.255.255");
        }
        co(function * () {
            this.mutilcastAddress = (yield thunkify(dns.lookup)(this.host))[0];
            this.mutilcastPort = registryUrl.port <= 0 ? DEFAULT_MULTICAST_PORT : registryUrl.port;
            this.mutilcastSocket = dgram.createSocket('udp4');
            this.mutilcastSocket.setMulticastLoopback(false);
            this.mutilcastSocket.addMembership(this.mutilcastAddress);
            this.mutilcastSocket.on('message', function(data, rinfo) {
                let msg = data.toString('utf8').trim();
                let i = msg.indexOf('\n');
                if (i > 0) {
                    msg = msg.substring(0, i).trim();
                }
                receive.call(this, msg, rinfo);
            }.bind(this));
        }.bind(this));
        this.cleanPeriod = registryUrl.parameters[Constants.SESSION_TIMEOUT_KEY] || Constants.DEFAULT_SESSION_TIMEOUT;
        if (URL.Boolean(registryUrl.parameters["clean"], true)) {
            setInterval(function() {
                try {
                    clean.call(this);
                }catch(err) {
                    if (this.logger) {
                        this.logger.error('Unexpected exception occur at clean expired provider', err);
                    } else {
                        console.error('Unexpected exception occur at clean expired provider', err.stack);
                    }
                }
            }.bind(this), this.cleanPeriod);
        } else {
            this.cleanFuture = null;
        }
    },
    doRegister(url) {
        broadcast.call(this, Constants.REGISTER + " " + url.toFullString());
    },
    doUnregister(url) {
        broadcast.call(this, Constants.UNREGISTER + " " + url.toFullString());
    },
    doSubscribe(url, listener) {
        if (Constants.ANY_VALUE == url.getServiceInterface()) {
            this.admin = true;
        }
        broadcast.call(this, Constants.SUBSCRIBE + " " + url.toFullString());
        //listener.wait(url.getParameter(Constants.TIMEOUT_KEY, Constants.DEFAULT_TIMEOUT));
    },
    doUnsubscribe(url, listener) {
        if (Constants.ANY_VALUE != url.getServiceInterface()
            && URL.Boolean(url.parameters[Constants.REGISTER_KEY], true)) {
            this.unregister(url);
        }
        broadcast.call(this, Constants.UNSUBSCRIBE + " " + url.toFullString());
    },
    isAvailable() {
        return this.mutilcastSocket != null;
    },
    destroy() {
        this.$super();
        if (this.cleanFuture != null) {
            clearInterval(this.cleanFuture);
        }
        try {
            this.mutilcastSocket.dropMembership(this.mutilcastAddress);
            this.mutilcastSocket.close();
        } catch (e) {
            if (this.logger)
                this.logger.error(e);
            else
                console.error(e.stack);
        }
    },
    registeredFn(url) {
        for (let entry of this.subscribed.entries()) {
            let key = entry[0];
            if (UrlUtils.isMatch(key, url)) {
                let urls = this.received.get(key);
                if (urls == null) {
                    this.received.set(key, new Set());
                    urls = this.received.get(key);
                }
                urls.add(url);
                for (let listener of entry[1].values()) {
                    this.notify(key, listener, [...urls]);
                    listener.notify();
                }
            }
        }
    },
    unregistered(url) {
        for (let entry of this.subscribed.entries()) {
            let key = entry[0];
            if (UrlUtils.isMatch(key, url)) {
                let urls = this.received.get(key);
                if (urls != null) {
                    urls.delete(url);
                }
                for (let listener of entry[1].values()) {
                    this.notify(key, listener, [...urls]);
                }
            }
        }
    },
    subscribedFn(url, listener) {
        let lookup = this.lookup(url);
        if (ring.instance(lookup, Promise)) {
            lookup.then(function(urls) {
                this.notify(url, listener, urls);
            }.bind(this));
            return;
        }
        this.notify(url, listener, lookup);
    },
    register(url) {
        this.$super(url);
        this.registeredFn(url);
    },
    unregister(url) {
        this.$super(url);
        this.unregistered(url);
    },
    subscribe(url, listener) {
        this.$super(url, listener);
        this.subscribedFn(url, listener);
    },
    unsubscribe(url, listener) {
        this.$super(url, listener);
        this.received.remove(url);
    },
    lookup(url) {
        let urls= [];
        let notifiedUrls = this.notified.get(url);
        if (notifiedUrls != null && notifiedUrls.size > 0) {
            for (let values of notifiedUrls.values()) {
                urls.push(values);
            }
        }
        if (_.isEmpty(urls)) {
            let cacheUrls = this.getCacheUrls(url);
            if (!_.isEmpty(urls)) {
                urls.push(cacheUrls);
            }
        }
        if (_.isEmpty(urls)) {
            for (let u of this.registered.values()) {
                if (UrlUtils.isMatch(url, u)) {
                    urls.push(u);
                }
            }
        }
        if (Constants.ANY_VALUE == url.getServiceInterface()) {
            for (let u of this.subscribed.keys()) {
                if (UrlUtils.isMatch(url, u)) {
                    urls.push(u);
                }
            }
        }
        return urls;
    }
});
function isMulticastAddress(ip) {
    let i = ip.indexOf('.');
    if (i > 0) {
        let prefix = ip.substring(0, i);
        if (_.isFinite(prefix)) {
            let p = parseInt(prefix);
            return p >= 224 && p <= 239;
        }
    }
    return false;
}
function clean() {
    if (this.admin) {
        for (let providers of this.received.values()) {
            for (let url of providers) {
                if (isExpired.call(this, url)) {
                    if (this.logger) {
                        logger.warn("Clean expired provider %s", url);
                    }
                    this.doUnregister(url);
                }
            }
        }
    }
}

function isExpired(url) {
    if (!URL.Boolean(url.parameters[Constants.DYNAMIC_KEY], true)
        || url.port <= 0
        || Constants.CONSUMER_PROTOCOL == url.protocol
        || Constants.ROUTE_PROTOCOL == url.protocol
        || Constants.OVERRIDE_PROTOCOL == url.protocol) {
        return false;
    }
    return false;
}

function receive(msg, remoteAddress) {
    if (this.logger) {
        this.logger.info("Receive multicast message: %s from ", msg, remoteAddress);
    }
    if (msg.startsWith(Constants.REGISTER)) {
        let url = URL.valueOf(msg.substring(Constants.REGISTER.length).trim());
        this.registeredFn(url);
    } else if (msg.startsWith(Constants.UNREGISTER)) {
        let url = URL.valueOf(msg.substring(Constants.UNREGISTER.length).trim());
        this.unregistered(url);
    } else if (msg.startsWith(Constants.SUBSCRIBE)) {
        let url = URL.valueOf(msg.substring(Constants.SUBSCRIBE.length).trim());
        let urls = this.registered;
        if (urls != null && urls.size > 0) {
            for (let u of urls.values()) {
                if (UrlUtils.isMatch(url, u)) {
                    co(function * () {
                        let host = remoteAddress != null && remoteAddress.address != null
                            ? remoteAddress.address : yield url.getIp();
                        if (URL.Boolean(url.parameters["unicast"], true) // 消费者的机器是否只有一个进程
                            && getIPAdress() != host) { // 同机器多进程不能用unicast单播信息，否则只会有一个进程收到信息
                            unicast.call(this, Constants.REGISTER + " " + u.toFullString(), host);
                        } else {
                            broadcast.call(this, Constants.REGISTER + " " + u.toFullString());
                        }
                    }.bind(this));
                }
            }
        }
    }
}

function broadcast(msg) {
    if (this.logger) {
        this.logger.info("Send broadcast message: %s to %s:%d", msg, this.mutilcastAddress, this.mutilcastPort);
    }
    let data = new Buffer(msg + '\n');
    this.mutilcastSocket.send(data, 0, data.length, this.mutilcastPort, this.mutilcastAddress);
}

function unicast(msg, host) {
    if (this.logger) {
        this.logger.info("Send unicast message: %s to %s:%d", msg, host, this.mutilcastPort);
    }
    let data = new Buffer(msg + '\n');
    this.mutilcastSocket.send(data, 0, data.length, this.mutilcastPort, host);
}
function getIPAdress(){
    var interfaces = require('os').networkInterfaces();
    for(var devName in interfaces){
        var iface = interfaces[devName];
        for(var i=0;i<iface.length;i++){
            var alias = iface[i];
            if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){
                return alias.address;
            }
        }
    }
}
const DEFAULT_MULTICAST_PORT = 1234;
module.exports = MulticastRegistry;