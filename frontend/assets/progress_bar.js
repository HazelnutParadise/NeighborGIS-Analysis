const ProgressBar=()=> {
    let timeCount = 0;
    let timeCounter = null;
    const PROGRESS_BAR = document.querySelector('.progress-bar');
    // 進度條控制函數
    function show() {
        PROGRESS_BAR.classList.add('loading');
        timeCounter = setInterval(() => {
            timeCount += 10; // 以 1 毫秒為單位計時
        }, 10);
    }
    function hide() {
        clearInterval(timeCounter);
        
        const currentSeconds = Math.floor(timeCount / 1000);
        const waitTime = ((currentSeconds + 1) * 1000) - timeCount;
        
        return new Promise(resolve => {
            setTimeout(() => {
                timeCount = 0;
                PROGRESS_BAR.classList.remove('loading');
                resolve();
            }, waitTime);
        });
    }
    return {
        show,
        hide
    }
}