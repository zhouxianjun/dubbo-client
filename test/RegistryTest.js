/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/28
 * Time: 10:00
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
const MulticastRegistry = require('../lib/registry/MulticastRegistry');
const URL = require('../lib/registry/URL');
const ReferenceUtils = require('../lib/util/ReferenceUtils');
const NotifyListener = require('../lib/registry/NotifyListener');
const Logger = require('./Logger');
let url = URL.valueOf('multicast://224.5.6.7:1234/com.alibaba.dubbo.registry.RegistryService?application=demo-consumer&backup=224.5.6.7:5678&dubbo=2.0.0&interface=com.alibaba.dubbo.registry.RegistryService&pid=9400&timestamp=1459132151303');
let registry = new MulticastRegistry(url);
registry.logger = Logger;

function doRefer(cluster, registry, type, url) {

}
console.log(ReferenceUtils.loadRegistries(false));