const ProgressBar = () => {
    let call_idx = 0;
    let timeCount = 0;
    let timeCounter = null;
    let hideTimer = null;
    const PROGRESS_BAR = document.querySelector('.progress-bar');
    
    // 進度條控制函數
    function show() {
        // 取消任何可能正在執行的隱藏計時器
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        
        if (!PROGRESS_BAR.classList.contains('loading')) {
            PROGRESS_BAR.classList.add('loading');
        }
        call_idx += 1;
        
        // 確保在多次調用 show 時只有一個計時器在運行
        if (timeCounter === null) {
            timeCounter = setInterval(() => {
                timeCount += 1; // 以 1 毫秒為單位計時
            }, 1);
        }
        
        return call_idx; // 返回當前計數，用於調試
    }
    
    function hide() {
        if (!PROGRESS_BAR.classList.contains('loading')) return Promise.resolve();
        
        if (call_idx > 1) {
            call_idx -= 1;
            return Promise.resolve();
        }
        
        // 重置 call_idx 確保不會卡在非零狀態
        call_idx = 0;
        
        if (timeCounter !== null) {
            clearInterval(timeCounter);
            timeCounter = null;
        }
        
        const currentSeconds = Math.floor(timeCount / 1000);
        const waitTime = Math.max(100, ((currentSeconds + 1) * 1000) - timeCount);
        
        return new Promise(resolve => {
            hideTimer = setTimeout(() => {
                timeCount = 0;
                PROGRESS_BAR.classList.remove('loading');
                hideTimer = null;
                resolve();
            }, waitTime);
        });
    }
    
    // 添加安全關閉方法，用於強制關閉進度條，無視計數器狀態
    function forceHide() {
        call_idx = 0;
        
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        
        if (timeCounter !== null) {
            clearInterval(timeCounter);
            timeCounter = null;
        }
        
        timeCount = 0;
        PROGRESS_BAR.classList.remove('loading');
        return Promise.resolve();
    }
    
    // 獲取當前狀態 (調試用)
    function getStatus() {
        return {
            call_idx,
            timeCount,
            isLoading: PROGRESS_BAR.classList.contains('loading')
        };
    }
    
    return {
        show,
        hide,
        forceHide,
        getStatus
    };
}