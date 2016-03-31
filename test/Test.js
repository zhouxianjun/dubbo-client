/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/21
 * Time: 14:00
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
//const AbstractRegistry = require('../lib/registry/AbstractRegistry');
//new AbstractRegistry('multicast://224.5.6.7:1234@aaa:sss/com.alibaba.dubbo.registry.RegistryService?application=demo-provider&backup=224.5.6.7:5678&dubbo=2.0.0&interface=com.alibaba.dubbo.registry.RegistryService&owner=william&pid=10616&timestamp=1458543365471');
const logger = require('tracer').dailyfile({
    root:'../logs',
    format : [
        "{{timestamp}} <{{title}}>  [{{file}}:{{line}}:{{pos}}] - {{message}}", //default format
        {
            error : "{{timestamp}} <{{title}}>  [{{file}}:{{line}}:{{pos}}] - {{message}}\nCall Stack:\n{{stack}}" // error format
        }
    ],
    dateformat : "HH:MM:ss.L",
    preprocess :  function(data){
        data.title = data.title.toUpperCase();
    },
    transport: function(data){
        console.log(data.output);
    }
});
const dgram = require('dgram');
const net = require('net');
const util = require('util');
const ring = require('ring');
const co = require('co');
const URL = require('../lib/registry/URL.ring');
let u = new URL({
    protocol: 'http',
    host: 'www.cn-face.com',
    port: 8888,
    path: 'com.alibaba.dubbo.registry.RegistryService',
    parameters: {
        application: 'demo-provider'
    }
});
URL.xx = 1;
console.log(require.cache['e:\\Gary\\working\\dubbo-client\\lib\\Constants.js'].exports);
console.log(u.toString());

console.log('multicast://224.5.6.7:1234?backup=224.5.6.7:5678'.split(/\s*[|;]+\s*/));

let a = new Set([1,u,2]);
console.log([...a].indexOf(u));

var RingUtils = require('../lib/util/RingUtils');
var object = RingUtils.newObject('URL');
console.log(object.protocol);
object.protocol = 111;
console.log(RingUtils.newObject('URL').protocol);