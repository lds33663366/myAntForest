function Point(x, y) {
    this.x = x;
    this.y = y;

    this.toString = () => {
        return "[" + x + "," + y + "]";
    }
};

let defaultSettings = {
    DETECT_STRATEGY: "time interval", //未成熟能量收集策略： "time interval"--按时间区间来监测收取；其它的按监测时长来收取
    DETECT_START_TIME: "07:16:00", //未成熟能量循环点击开始时间
    DETECT_END_TIME: "07:18:00", //未成熟能量循环点击结束时间
    DETECT_DURATION: 72000,  //未成熟能量的时间监测时长(单位：秒)，和DETECT_START_TIME DETECT_END_TIME是不同的策略
    CLICK_IMMATURATE_INTERVAL: 100,  //循环点击未成熟能量的间隔（单位：毫秒）
    JUMP_IN_FOREST_WAITING_TIME: 6000, //进入蚂蚁森林需要等待的时间
    PAGE_JUMP_WAITING_TIME: 1500, //页面跳转等待的时间
    PAGE_SCROLL_WAITING_TIME: 300, //页面翻动后预留的等待时间
    SCREEN_CLICK_WAITING_TIME: 50, //屏幕点击的时间间隔
    KILL_AUTOJS_APP: true, //结束autojs进程（安全起见，以防手机丢失后，定时任务解锁导致手机被使用）
    RUN_STRATEGY: "debug" //脚本运行策略：debug--调试
};

let scrollToEnd = (direction => {
    let scrollCount = 5;
    let scrollAction = (direction == "up") ? scrollUp : scrollDown;
    while (scrollCount--) {
        scrollAction();
        sleep(defaultSettings.PAGE_SCROLL_WAITING_TIME);
    }
});

let tryInForest = () => {

    /**打开蚂蚁森林页面 */
    app.startActivity({
        action: "VIEW",
        data: "alipays://platformapi/startapp?appId=60000002"
    });

    let inForestDetectCount = 3;
    while (inForestDetectCount--) {

        sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);

        if ((text("蚂蚁森林").exists()) && (text("种树").exists())) {
            console.log("登录到了蚂蚁森林页面...");
            /**滑动到顶部 */
            let top = text("种树").findOnce().bounds().top;
            if (top < 10) {
                scrollToEnd("up");
            }
            return true;
        }
    }
    return false;
}

/**登入蚂蚁森林界面 */
let loginAntForest = () => {
    let inForestDetectCount = defaultSettings.JUMP_IN_FOREST_WAITING_TIME / defaultSettings.PAGE_JUMP_WAITING_TIME;
    while (!tryInForest() && inForestDetectCount--) {
        console.log("界面返回并尝试再次进入蚂蚁森林界面");
        back();
        sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);
    }

    if (inForestDetectCount <= 0) {
        return false;
    }

    sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);
    return true;
};

/**点击多个坐标 */
let clickPoints = (list => {
    list.forEach(point => {
        click(point.x, point.y);
        sleep(defaultSettings.SCREEN_CLICK_WAITING_TIME);
    });
});

/**获取蚂蚁森林的能量控件：immaturate对应未成熟能量，mature对应成熟能量 */
let collectEnergy = (tag => {
    let match = {
        "immaturate": /\xa0/,
        "mature": /收集能量\d+克/
    };

    let list = className("Button").textMatches(match[tag]).find();

    // let list = className("Button").find().filter(node => {
    //     var text = node.text();
    //     var reg = match[tag];
    //     if (reg.test(text)) {
    //         return true;
    //     }
    //     return false;
    // });

    return list;
});

/**获取能量的坐标 */
let getEnergyPoints = (list => {
    let pointList = new Array();
    list.forEach(node => {
        let bound = node.bounds();
        let x = bound.centerX();
        let y = bound.centerY();

        pointList.push(new Point(x, y));
    });

    return pointList;
});

/**收集已成熟的能量 */
let collectMatureEnergy = () => {
    let energyWidget = collectEnergy("mature");
    let energyPoints = getEnergyPoints(energyWidget);
    if (energyPoints.length > 0) {
        console.log("成熟能量的坐标点有：" + energyPoints);
        clickPoints(energyPoints);
    }
    else {
        console.log("没有成熟的能量");
    }
}

/**循环监测收集未成熟的能量 */
let collectImmaturateEnergy = (strategy => {
    let energyWidget = collectEnergy("immaturate");

    let energyPoints = getEnergyPoints(energyWidget);
    if (energyPoints.length > 0) {
        console.log("未成熟能量的坐标点有：" + energyPoints);
    }
    else {
        console.log("没有未成熟的能量");
        return;
    }

    let clickInterval = defaultSettings.CLICK_IMMATURATE_INTERVAL;
    if (strategy == 'time interval') {
        toastLog("时间范围点击策略：在[" + defaultSettings.DETECT_START_TIME + " -- " + defaultSettings.DETECT_END_TIME + "]时间范围内不断点击未成熟的能量，点击速率" + clickInterval + "毫秒");

        let date = new Date();
        let today = date.toDateString();
        let startTime = Date.parse(today + " " + defaultSettings.DETECT_START_TIME);
        let endTime = Date.parse(today + " " + defaultSettings.DETECT_END_TIME);
        let now = date.getTime();

        while (now > startTime && now < endTime) {
            now = new Date().getTime();

            clickPoints(energyPoints);
            sleep(clickInterval);
        }
    }
    else {
        let clickDuration = defaultSettings.DETECT_DURATION;
        let clickCount = clickDuration * 1000 / defaultSettings.CLICK_IMMATURATE_INTERVAL;

        toastLog("按点击次数策略：点击" + clickCount + "次后结束");
        while (clickCount--) {
            clickPoints(energyPoints);
            sleep(clickInterval);
        }
    }
});

/**收取当前屏幕下的好友能量 */
let collectCurrentScreenFriendsEnergy = (icon) => {
    const WIDTH = device.width;
    const HEIGHT = device.height;
    let row_height = HEIGHT / 10;
    let offset = icon.getHeight() / 2;

    let capture = captureScreen();
    let options = {
        region: [WIDTH - row_height, row_height],
        threshold: 0.8
    };
    let target = findImage(capture, icon, options);
    let backAndGetNext = () => {
        back();
        sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);

        capture = captureScreen();
        target = findImage(capture, icon, options);
    };

    while (target) {
        click(WIDTH / 2, target.y + offset);
        console.log(target);

        sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);

        /**遇到保护罩，直接返回，跳到下一位好友 */
        if (descMatches(/\d{2}:\d{2}:\d{2}/).findOnce()) {
            toastLog("保护罩还剩" + cover.contentDescription + "，忽略");
            backAndGetNext();
            continue;
        }

        /**跳过白名单 */
        if (textMatches("小叶子的蚂蚁森林").findOnce()) {
            toastLog("跳过白名单");
            backAndGetNext();
            continue;
        }

        collectMatureEnergy();
        sleep(200);
        backAndGetNext();
    }
};

/**收取好友能量 */
let collectFriendsEnergy = () => {
    const WIDTH = device.width;
    const HEIGHT = device.height;

    scrollToEnd("down");
    text("查看更多好友").findOnce().click();
    sleep(defaultSettings.PAGE_JUMP_WAITING_TIME);
    /**屏幕可操作的范围 */
    let screenServiceDisplay = context.getSystemService(context.WINDOW_SERVICE).getDefaultDisplay();
    let serviceHeightDisplay = screenServiceDisplay.getHeight();
    let inviteWidget = () => textMatches("邀请").findOnce();
    let inviteWidgetBottom = () => inviteWidget().bounds().bottom;

    /**保险起见，在无法识别屏幕底部的情况下，向下翻20次后停止 */
    let scroll_count = 20;

    let screenCaptureAuth = images.requestScreenCapture(false);
    if (!screenCaptureAuth) {
        throw Error("无法获取截图权限，收取好友能量失败");
    }

    let icon = images.read("take.jpg");

    while (((!inviteWidget()) || (inviteWidgetBottom() > serviceHeightDisplay)) && scroll_count--) {
        collectCurrentScreenFriendsEnergy(icon);
        /**向下翻 */
        swipe(WIDTH / 2, 3 * HEIGHT / 4, WIDTH / 2, HEIGHT / 4, 200);
        sleep(defaultSettings.PAGE_SCROLL_WAITING_TIME);
    }

    icon.recycle();
};

/**退出界面 */
let closeAFpage = () => {
    let depth = 4;
    while (depth--) {
        back();
        sleep(200);
    }
};

let closeAd = () => {
    let ad = textMatches("关闭蒙层").findOnce();
    if (ad) {
        ad.close();
    }
};

let exitAutojs = () => {
    let killAutojs = defaultSettings.KILL_AUTOJS_APP;
    if (killAutojs) {
        var nowPid = android.os.Process.myPid();
        var am = context.getSystemService(java.lang.Class.forName("android.app.ActivityManager"));
        var list = am.getRunningAppProcesses();
        for (var i = 0; i < list.size(); i++) {
            var info = list.get(i)
            if (info.pid != nowPid) {
                kill(info.pid);
            }
        }
    }

    kill(nowPid);

    function kill(pid) {
        android.os.Process.killProcess(pid);
    }
}

/**任务完成后的收尾工作 */
let ending = () => {
    closeAFpage();
    if (defaultSettings.RUN_STRATEGY != "debug") {
        exitAutojs();
    }
    device.cancelKeepingAwake();
};

(function () {
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

    toastLog("启动脚本，开始收取蚂蚁森林能量...");

    /**进入蚂蚁森林 */
    let isLogin = loginAntForest();
    if (!isLogin) {
        console.log("进入蚂蚁森林失败");
        return;
    }

    /**如果有广告，先关闭广告 */
    closeAd();

    /**获取已成熟能量 */
    toastLog("开始收取已成熟的能量...");
    collectMatureEnergy();

    /**点击未成熟能量 */
    toastLog("开始点击未成熟的能量...");
    collectImmaturateEnergy(defaultSettings.DETECT_STRATEGY);

    toastLog("开始收取好友能量...");
    collectFriendsEnergy();

    console.log("能量收取结束, 收尾...");
    ending();

    toastLog("脚本自动关闭...");
})();
