/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/30
 * Time: 12:46
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
const path = require('path');
const fs = require('fs');
module.exports = {
    logger: null,
    /**
     * 向下查找
     * @param {string} parent - 父目录
     * @returns {*}
     */
    getLogger: function(parent){
        let filePath = path.join(parent, FILE_NAME);
        if(fs.existsSync(filePath)) {
            return require(filePath);
        }
        let files = fs.readdirSync(parent);
        files.forEach(function(file){
            file = path.join(parent, file);
            let stats = fs.statSync(file);
            if(stats.isDirectory()){
                filePath = this.getLogger(file);
                if(filePath){
                    return filePath;
                }
            }
        }, this);
        return null;
    },
    log() {
        if (!this.logger)
            this.logger = this.getLogger(process.cwd());
        if (!this.logger)
            this.logger = console;
        return this.logger
    }
};
const FILE_NAME = 'Logger.js';