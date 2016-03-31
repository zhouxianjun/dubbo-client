/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/3/30
 * Time: 9:04
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
const Invoker = require('./Invoker.ring');
const LoadBalance = require('../loadBalance/LoadBalance.ring');
const URL = require('../../registry/URL.ring');
const Constants = require('../../Constants');
const RingUtils = require('../../util/RingUtils');
const logger = require('../../util/LogUtils').log();
let AbstractClusterInvoker = ring.create([Invoker], {
    directory: null,
    availablecheck: null,
    destroyed: false,
    stickyInvoker: null,
    init(directory, url) {
        if (directory == null)
            throw new Error("service directory == null");

        this.directory = directory ;
        //sticky 需要检测 avaliablecheck
        this.availablecheck = URL.Boolean(url.parameters[Constants.CLUSTER_AVAILABLE_CHECK_KEY], Constants.DEFAULT_CLUSTER_AVAILABLE_CHECK) ;
    },
    getInterface() {
        return this.directory.getInterface();
    },
    getUrl() {
        return this.directory.getUrl();
    },
    isAvailable() {
        if (this.stickyInvoker != null) {
            return this.stickyInvoker.isAvailable();
        }
        return this.directory.isAvailable();
    },
    destroy() {
        this.directory.destroy();
        this.destroyed = true;
    },
    /**
     * 使用loadbalance选择invoker.</br>
     * a)先lb选择，如果在selected列表中 或者 不可用且做检验时，进入下一步(重选),否则直接返回</br>
     * b)重选验证规则：selected > available .保证重选出的结果尽量不在select中，并且是可用的
     *
     * @param availablecheck 如果设置true，在选择的时候先选invoker.available == true
     * @param selected 已选过的invoker.注意：输入保证不重复
     *
     */
    select(loadbalance, invocation, invokers, selected) {
        if (invokers == null || invokers.size == 0)
            return null;
        let methodName = invocation == null ? "" : invocation.getMethodName();

        let sticky = [...invokers][0].getUrl().getMethodParameter(methodName,Constants.CLUSTER_STICKY_KEY, Constants.DEFAULT_CLUSTER_STICKY) ;
        //ignore overloaded method
        if (this.stickyInvoker != null && [...invokers].indexOf(this.stickyInvoker) == -1){
            this.stickyInvoker = null;
        }
        //ignore cucurrent problem
        if (sticky && this.stickyInvoker != null && (selected == null || [...selected].indexOf(this.stickyInvoker) == -1)){
            if (this.availablecheck && this.stickyInvoker.isAvailable()){
                return this.stickyInvoker;
            }
        }
        let invoker = this.doselect(loadbalance, invocation, invokers, selected);

        if (sticky){
            this.stickyInvoker = invoker;
        }
        return invoker;
    },
    doselect(loadbalance, invocation, invokers, selected) {
        if (invokers == null || invokers.size == 0)
            return null;
        let invokerArray = [...invokers];
        if (invokers.size == 1)
            return invokerArray[0];
        // 如果只有两个invoker，退化成轮循
        if (invokers.size == 2 && selected != null && selected.size > 0) {
            return invokerArray[0] == invokerArray[0] ? invokerArray[1] : invokerArray[0];
        }
        let invoker = loadbalance.select(invokers, this.getUrl(), invocation);

        //如果 selected中包含（优先判断） 或者 不可用&&availablecheck=true 则重试.
        if( (selected != null && [...selected].indexOf(invoker) != -1)
            ||(!invoker.isAvailable() && this.getUrl() != null && this.availablecheck)){
            try{
                let rinvoker = this.reselect(loadbalance, invocation, invokers, selected, this.availablecheck);
                if(rinvoker != null){
                    invoker =  rinvoker;
                }else{
                    //看下第一次选的位置，如果不是最后，选+1位置.
                    let index = invokerArray.indexOf(invoker);
                    try{
                        //最后在避免碰撞
                        invoker = index < invokers.size -1 ? invokerArray[index+1] : invoker;
                    }catch (err) {
                        logger.error('%s may because invokers list dynamic change, ignore.', err.message, err);
                    }
                }
            }catch (err){
                logger.error("clustor relselect fail reason is :%s if can not slove ,you can set cluster.availablecheck=false in url", err.message, err);
            }
        }
        return invoker;
    },
    /**
     * 重选，先从非selected的列表中选择，没有在从selected列表中选择.
     * @param loadbalance
     * @param invocation
     * @param invokers
     * @param selected
     * @return
     */
    reselect(loadbalance, invocation, invokers, selected, availablecheck) {

        //预先分配一个，这个列表是一定会用到的.
        let reselectInvokers = new Set(invokers.size > 1 ? (invokers.size - 1) : invokers.size);

        //先从非select中选
        if(availablecheck){ //选isAvailable 的非select
            for(let invoker of invokers.values()){
                if(invoker.isAvailable()){
                    if(selected == null || [...selected].indexOf(invoker) == -1){
                        reselectInvokers.add(invoker);
                    }
                }
            }
            if(reselectInvokers.size > 0){
                return loadbalance.select(reselectInvokers, this.getUrl(), invocation);
            }
        }else{ //选全部非select
            for(let invoker of invokers.values()){
                if(selected == null || [...selected].indexOf(invoker) == -1){
                    reselectInvokers.add(invoker);
                }
            }
            if(reselectInvokers.size > 0){
                return loadbalance.select(reselectInvokers, this.getUrl(), invocation);
            }
        }
        //最后从select中选可用的.
        if(selected != null){
            for(let invoker of selected.values()){
                if((invoker.isAvailable()) //优先选available
                    && [...reselectInvokers].indexOf(invoker) == -1){
                    reselectInvokers.add(invoker);
                }
            }
        }
        if(reselectInvokers.size > 0){
            return loadbalance.select(reselectInvokers, this.getUrl(), invocation);
        }
        return null;
    },
    invoke(invocation) {

        this.checkWheatherDestoried();

        let loadbalance;

        let invokers = this.list(invocation);
        if (invokers != null && invokers.size > 0) {
            loadbalance = RingUtils.getObject([...invokers][0].getUrl().getMethodParameter(invocation.getMethodName(), Constants.LOADBALANCE_KEY, Constants.DEFAULT_LOADBALANCE), LoadBalance);
        } else {
            loadbalance = RingUtils.getObject(Constants.DEFAULT_LOADBALANCE, LoadBalance);
        }
        return doInvoke(invocation, invokers, loadbalance);
    },
    checkWheatherDestoried() {
        if(this.destroyed){
            throw new Error("Rpc cluster invoker for " + this.getInterface() + " is now destroyed! Can not invoke any more.");
        }
    },
    join(directory) {}
});
module.exports = AbstractClusterInvoker;