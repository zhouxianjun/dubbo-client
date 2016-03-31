/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/30
 * Time: 15:04
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
const fs = require('fs');
const path = require('path');
const ring = require('ring');
const _ = require('underscore');
const cache = new Map();
const cacheObject = new Map();
module.exports = {
    getClass(name, reload) {
        if (!cache.has(name) || reload) {
            cache.delete(name);
            (function(fn) {
                fn.call(fn, 'e:\\Gary\\working\\dubbo-client');
            })(function(parent) {
                let files = fs.readdirSync(parent);
                files.forEach(function(filePath) {
                    let fileName = filePath;
                    filePath = path.join(parent, filePath);
                    let stats = fs.statSync(filePath);
                    if (stats.isDirectory()) {
                        this.call(this, filePath);
                    } else {
                        if (filePath.endsWith('.ring.js')) {
                            try {
                                let c = require(filePath);
                                let cName = c.prototype.name;
                                if (_.isUndefined(cName)) {
                                    cName = fileName.substring(0, fileName.length - '.ring.js'.length);
                                }
                                if (cName == name) {
                                    let values;
                                    if (cache.has(name)) {
                                        values = cache.get(name);
                                    } else {
                                        values = new Set();
                                    }
                                    values.add(c);
                                    cache.set(name, values);
                                }
                            } catch (err) {
                                console.error(err.stack);
                            }
                        }
                    }
                }, this);
            });
        }
        return cache.get(name);
    },
    newObject(name, type) {
        let classes = this.getClass(name);
        if (!classes) return null;
        return getObject(classes, type || false, Array.prototype.slice.call(arguments, arguments.length >= 2 ? 2 : 1));
    },
    getObject(name, type) {
        let classes = this.getClass(name);
        if (!classes) return null;
        if (cacheObject.has(name)) {
            if (!type) return [...(cacheObject.get(name).values())][0];
            else {
                let typeMap = cacheObject.get(name);
                if (typeMap.has(type)) return typeMap.get(type);
            }
        }
        let obj = getObject(classes, type || false, Array.prototype.slice.call(arguments, arguments.length >= 2 ? 2 : 1));
        if (obj) {
            let typeMap = cacheObject.get(name);
            if (!typeMap) typeMap = new Map();
            typeMap.set(type || '$', obj);
            cacheObject.set(name, typeMap);
        }
        return obj;
    }
};
function getObject(classes, type, arg) {
    if (!type) {
        let cls = [...classes][0];
        let obj = new cls();
        cls.apply(obj, arg);
        return obj;
    } else {
        for (let c of classes.values()) {
            let obj = new c();
            if (ring.instance(obj, type)) {
                c.apply(obj, arg);
                return obj;
            }
        }
    }
    return null;
}