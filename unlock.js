function Device() {

    let keyPadScreen = ()=> id("com.android.systemui:id/keyguard_host_view");/**密码锁屏界面 */

    /**密码解锁 */
    this.clickNums = (pw) => {

        if (!keyPadScreen().exists()) {
            throw Error("进入密码锁屏页面失败，解锁密码失败");
        }

        /**两种方式获取按键 */
        let getNumericKeypad = num => id("com.android.systemui:id/key" + num);
        let getNumsBySingleDesc = num => desc(num);

        let numsStrategy = () => {
            if (getNumsBySingleDesc(1).exists()) {
                console.log("匹配到内容描述PIN解锁控件");
                return getNumsBySingleDesc;
            }
            if (getNumericKeypad(1).exists()) {
                console.log("匹配到通用PIN/KEY解锁控件");
                return getNumericKeypad;
            }
            throw Error("找不到虚拟按键控件，无法解锁屏幕...");
        };

        let getNumsCtl = numsStrategy();

        console.log("密码解锁中......");
        pw.split("").forEach(num => {
            let node = getNumsCtl(num).findOnce();
            node.click();
        });
    },

        /** 判断是否锁屏 */
        this.isLocked = () => {
            let keyguard_manager = context.getSystemService(context.KEYGUARD_SERVICE);
            let result = keyguard_manager.isKeyguardLocked();
            return result;
        },

        /** 唤醒屏幕 */
        this.wakeup = () => {
            console.log("尝试唤醒屏幕");

            !device.isScreenOn() && device.wakeUpIfNeeded();
            // while (!device.isScreenOn()) {
            //     device.wakeUpIfNeeded();
            sleep(1000);
            // }
        },

        /** 划开屏幕 */
        this.swipe_layer = () => {
            let x = device.width / 2;
            let y = device.height / 4;

            let swipeRetryTime = 3;

            while (!keyPadScreen().exists() && swipeRetryTime--) {
                var success = swipe(x, 3 * y, x, y, 200);
                sleep(500);
            }

            return keyPadScreen().exists();
        }

    this.unlock = () => {
        let pw = unescape("%38%33%34%37%30%30");
        let LOCK_RETRY_TIMES = 3;/**解锁尝试次数 */
        if (!this.isLocked()) {
            console.log("当前屏幕已解锁");
            return true;
        }

        this.wakeup();
        while (this.isLocked() && LOCK_RETRY_TIMES--) {
            if (this.swipe_layer()) {
                sleep(500);
                this.clickNums(pw);
                sleep(500);
            }
            else {
                console.log("滑动屏幕失败，可能是无障碍服务未启动");
            }

        }

        if (LOCK_RETRY_TIMES <= 0) {
            console.log("请打开无障碍服务");

            return false;
        }

        if (this.isLocked() && LOCK_RETRY_TIMES <= 0) {
            console.log("解锁失败，可能是密码错误导致");
            return false;
        }

        if (!this.isLocked()) {
            console.log("解锁成功");
            return true;
        }
    }
}

// let de = new Device();
// de.unlock();

module.exports = Device;