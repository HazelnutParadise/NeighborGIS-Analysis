const tabBtns = document.querySelectorAll('.tab-btn');
const pages = document.querySelectorAll('.page');

// 點擊分頁按鈕時切換頁面
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 移除所有按鈕的active狀態
        tabBtns.forEach(b => b.classList.remove('active'));
        // 為當前點擊的按鈕添加active狀態
        btn.classList.add('active');

        // 獲取要顯示的頁面id
        const pageId = btn.dataset.page;

        // 隱藏所有頁面
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // 顯示對應的頁面
        const activePage = document.getElementById(pageId);
        activePage.classList.add('active');

        // 初始化當前頁面的滑動功能
        initPageSlider(activePage);

        // 更新地圖大小，防止地圖顯示異常
        if (pageId === 'page1' && typeof map !== 'undefined') {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    });
});

// 初始化頁面滑動功能
function initPageSlider(page) {
    // 重新綁定左右按鈕到當前頁面的容器
    const pageContent = page.querySelector('.page-content');
    const containers = pageContent.querySelectorAll('.container');

    // 重新初始化頁面的滑動狀態
    setTimeout(() => {
        // 觸發自定義事件，通知left_right_btn.js重新初始化
        const event = new CustomEvent('pageChanged', {
            detail: {
                pageContent: pageContent,
                containers: containers
            }
        });
        document.dispatchEvent(event);
    }, 100);
}

// 初始顯示第一個分頁
tabBtns[0].click();
