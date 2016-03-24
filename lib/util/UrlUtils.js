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
const ring = require('ring');
const _ = require('underscore');
const Constants = require('../Constants');
let UrlUtils = ring.create({
    isMatch(consumerUrl, providerUrl){
        let consumerInterface = consumerUrl.getServiceInterface();
        let providerInterface = providerUrl.getServiceInterface();
        if(!(Constants.ANY_VALUE === consumerInterface || consumerInterface == providerInterface)) return false;

        if (!this.isMatchCategory(providerUrl.parameters[Constants.CATEGORY_KEY] || Constants.DEFAULT_CATEGORY,
                consumerUrl.parameters[Constants.CATEGORY_KEY] || Constants.DEFAULT_CATEGORY)) {
            return false;
        }
        if (!Boolean(providerUrl.parameters[Constants.ENABLED_KEY] || true)
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
    }
});
module.exports = UrlUtils;