/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/21
 * Time: 17:08
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
let Constants = {};
/**
 * 注册中心是否同步存储文件，默认异步
 */
Constants.REGISTRY_FILESAVE_SYNC_KEY = 'save.file';
Constants.FILE_KEY = 'file';
Constants.BACKUP_KEY = 'backup';
Constants.INTERFACE_KEY = 'interface';
Constants.ANYHOST_KEY = 'anyhost';
Constants.ANYHOST_VALUE = '0.0.0.0';
Constants.ANY_VALUE = '*';
Constants.PROVIDERS_CATEGORY = 'providers';
Constants.DEFAULT_CATEGORY = Constants.PROVIDERS_CATEGORY;
Constants.REMOVE_VALUE_PREFIX = '-';
Constants.CATEGORY_KEY = 'category';
Constants.ENABLED_KEY = 'enabled';
Constants.GROUP_KEY = 'group';
Constants.VERSION_KEY = 'version';
Constants.CLASSIFIER_KEY = 'classifier';
Constants.EMPTY_PROTOCOL = 'empty';
Constants.DYNAMIC_KEY = 'dynamic';
Constants.REGISTRY_RETRY_PERIOD_KEY = 'retry.period'; // 注册中心失败事件重试事件
Constants.DEFAULT_REGISTRY_RETRY_PERIOD = 5 * 1000; // 重试周期
Constants.CHECK_KEY = 'check';
Constants.CONSUMER_PROTOCOL = 'consumer';
Constants.ROUTE_PROTOCOL = 'route';
Constants.OVERRIDE_PROTOCOL = 'override';
Constants.REGISTER = 'register';
Constants.UNREGISTER = 'unregister';
Constants.SUBSCRIBE = 'subscribe';
Constants.REGISTER_KEY = 'register';
Constants.UNSUBSCRIBE = 'unsubscribe';
Constants.SESSION_TIMEOUT_KEY = 'session';
Constants.DEFAULT_SESSION_TIMEOUT = 60 * 1000;
Constants.TIMESTAMP_KEY = 'timestamp';
Constants.PID_KEY = 'pid';
Constants.REGISTRY_SPLIT_PATTERN = /\s*[|;]+\s*/;
Constants.COMMA_SPLIT_PATTERN = /\s*[,]+\s*/;
Constants.REGISTRY_KEY = 'registry';
Constants.REGISTRY_PROTOCOL = 'registry';
Constants.SUBSCRIBE_KEY = 'subscribe';
Constants.REFER_KEY = 'refer'; //注册中心引用URL参数的KEY
Constants.DEFAULT_REGISTRY = 'dubbo';
module.exports = Constants;