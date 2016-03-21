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
    getBackupUrls(){
        let urls = [this.registryUrl];
        let backup = this.registryQuery[this.BACKUP_KEY];
        if (backup) {
            let backups = backup.split(',');
            if (backups && backups.length > 0) {
                backups.forEach(function(item) {
                    let split = item.split(':');
                    let host = split[0];
                    let port = split.length == 2 ? split[1] : this.registryUrl.port;
                    let url = _.extend(_.clone(this.registryUrl), {
                        host: host,
                        port: port
                    });
                    url.href = url.href.replace(url.protocol + '://' + url.host + ':' + url.port, url.protocol + '://' + item);
                });
            }
        }
    }
});
module.exports = AbstractRegistry;