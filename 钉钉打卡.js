let defaultSettings = {
    JUMP_IN_APP_TIME: 6000, //进入APP需要等待的时间
    PAGE_JUMP_WAITING_TIME: 1500, //页面跳转等待的时间
    KILL_AUTOJS_APP: true, //结束autojs进程（安全起见，以防手机丢失后，定时任务解锁导致手机被使用）
    RUN_STRATEGY: "debug" //脚本运行策略：debug--调试
};

let tryInApp = () => {

    /**打开蚂蚁森林页面 */
    app.startActivity({
        action: "VIEW",
        data: "dingtalk://dingtalkclient/action/switchtab?index=2&corpid=ding113377d49119790735c2f4657eb6378f&appid=158"
    });

    let inAppDetectCount = 3;
    while (inAppDetectCount--) {

        sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);

        if ((text("南瑞研究院西安研发中心").exists()) && (desc("考勤打卡").exists())) {
            console.log("到了钉钉打卡页面...");
            
            return true;
        }
    }
    return false;
}

/**启动app */
launchApp = ()=> {
    let inAppDetectCount = defaultSettings.PAGE_JUMP_WAITING_TIME / defaultSettings.PAGE_JUMP_WAITING_TIME;
    while (!tryInApp() && inAppDetectCount--) {
        console.log("界面返回并尝试再次进入钉钉界面");
        back();
        sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);
    }

    if (inAppDetectCount <= 0) {
        return false;
    }

    sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);
    return true;
};

(function() {
     // 自动打开无障碍服务
     auto();

     /**解锁屏幕 */
     let UnlockDevice = require("./unlock");
     let unlockDevice = new UnlockDevice();
     let isUnlock = unlockDevice.unlock();
 
     if (!isUnlock) {
         console.log("解锁失败，退出运行");
         return;
     }

    /**打开软件 */
    let isLogin = launchApp();
    if (!isLogin) {
        console.log("进入钉钉打卡界面失败");
        return;
    }

    desc("考勤打卡").findOnce().click();
    sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);

    let DutyWidget = descMatches(/[上下]班打卡/).findOnce();
    if (DutyWidget) {
        DutyWidget.click();
    }
    else {
        console.log("未识别到打卡");
    }
})();