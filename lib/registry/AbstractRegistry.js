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
const url = require('url');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const _ = require('underscore');
const RegistryService = require('./RegistryService');
let AbstractRegistry = RegistryService.$extend({
    logger: null, //日志输出
    URL_SEPARATOR: ' ', //URL地址分隔符，用于文件缓存中，服务提供者URL分隔
    registryUrl: null,
    registryQuery: null,
    syncSaveFile: false, //是否是同步保存文件
    subscribed: new Map(),
    init(registryUrl){
        this.registryUrl = url.parse(registryUrl);
        console.log(this.registryUrl);
        this.registryQuery = querystring.parse(this.registryUrl.query);
        this.syncSaveFile = Boolean(this.registryQuery[this.REGISTRY_FILESAVE_SYNC_KEY]);
        let filename = (this.registryQuery[this.FILE_KEY] || __dirname) + '/.dubbo/dubbo-registry-' + this.registryUrl.host + '.cache';
        if (!_.isEmpty()) {
            if (!fs.existsSync(filename) && !fs.existsSync(path.dirname(filename))){
                if (!fs.mkdirSync(filename)){
                    throw new Error("Invalid registry store file " + filename + ", cause: Failed to create directory " + path.dirname(filename) + "!");
                }
            }
        }
        //notify(url.getBackupUrls());
    },
    notifyUrls(urls){
        if (!urls || urls.length <= 0) return;
        for (let item of this.subscribed.entries()) {
            let serviceInterface = this.registryQuery[this.INTERFACE_KEY] || this.registryUrl.pathname.substring(1);
            console.log(item[0], item[1]);
        }
    }/*,
    isMatchUrl(consumerUrl, providerUrl){
        let consumerInterface = consumerUrl.getServiceInterface();
        String providerInterface = providerUrl.getServiceInterface();
        if( ! (Constants.ANY_VALUE.equals(consumerInterface) || StringUtils.isEquals(consumerInterface, providerInterface)) ) return false;

        if (! isMatchCategory(providerUrl.getParameter(Constants.CATEGORY_KEY, Constants.DEFAULT_CATEGORY),
                consumerUrl.getParameter(Constants.CATEGORY_KEY, Constants.DEFAULT_CATEGORY))) {
            return false;
        }
        if (! providerUrl.getParameter(Constants.ENABLED_KEY, true)
            && ! Constants.ANY_VALUE.equals(consumerUrl.getParameter(Constants.ENABLED_KEY))) {
            return false;
        }

        String consumerGroup = consumerUrl.getParameter(Constants.GROUP_KEY);
        String consumerVersion = consumerUrl.getParameter(Constants.VERSION_KEY);
        String consumerClassifier = consumerUrl.getParameter(Constants.CLASSIFIER_KEY, Constants.ANY_VALUE);

        String providerGroup = providerUrl.getParameter(Constants.GROUP_KEY);
        String providerVersion = providerUrl.getParameter(Constants.VERSION_KEY);
        String providerClassifier = providerUrl.getParameter(Constants.CLASSIFIER_KEY, Constants.ANY_VALUE);
        return (Constants.ANY_VALUE.equals(consumerGroup) || StringUtils.isEquals(consumerGroup, providerGroup) || StringUtils.isContains(consumerGroup, providerGroup))
            && (Constants.ANY_VALUE.equals(consumerVersion) || StringUtils.isEquals(consumerVersion, providerVersion))
            && (consumerClassifier == null || Constants.ANY_VALUE.equals(consumerClassifier) || StringUtils.isEquals(consumerClassifier, providerClassifier));
    }*/
});
module.exports = AbstractRegistry;