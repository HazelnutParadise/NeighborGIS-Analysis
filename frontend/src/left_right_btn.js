
const leftRightBtnController = () => {
    /**
     * 左右切換按鈕功能
     * 讓使用者可以切換不同的容器，將當前容器置中顯示
     * 同時保留完整的水平滾動功能，不限制用戶的滾動範圍
     * 支持在不同分頁內進行滑動
     */
    // 獲取所有容器與按鈕元素
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // 當前活動的分頁容器和容器元素
    let currentScrollContainer = null;
    let currentContainers = [];

    // 目前最接近中心的容器索引
    let currentIndex = 0;

    // 初始化頁面
    initActivePage();

    // 初始化當前活動的分頁
    function initActivePage() {
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            const pageContent = activePage.querySelector('.page-content');
            const containers = pageContent.querySelectorAll('.container');

            // 更新當前滾動容器和容器列表
            currentScrollContainer = pageContent;
            currentContainers = Array.from(containers);

            // 重設當前索引
            currentIndex = 0;

            // 如果只有一個容器，則置中顯示
            centerSingleContainer();

            // 更新按鈕狀態
            updateButtonStatus();

            // 綁定滾動事件
            bindScrollEvent(pageContent);
        }
    }

    // 初始化按鈕狀態
    function updateButtonStatus() {
        if (!currentScrollContainer || currentContainers.length === 0) {
            // 如果沒有容器，禁用按鈕
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            prevBtn.style.opacity = '0.5';
            nextBtn.style.opacity = '0.5';
            return;
        }

        // 檢查是否所有容器都能完整顯示
        const allContainersVisible = checkAllContainersVisible();

        if (allContainersVisible) {
            // 如果所有容器都可見，則禁用兩個按鈕
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            prevBtn.style.opacity = '0.5';
            nextBtn.style.opacity = '0.5';
        } else {
            // 否則，根據當前索引啟用或禁用
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === currentContainers.length - 1;

            // 視覺上的禁用效果
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        }
    }

    // 檢查是否所有容器都能完整顯示
    function checkAllContainersVisible() {
        if (!currentScrollContainer || currentContainers.length === 0) return true;

        // 計算所有容器的總寬度，包含間隙
        let totalWidth = 0;
        const gap = 10; // 容器之間的間隙，與CSS中的gap值保持一致

        currentContainers.forEach((container) => {
            totalWidth += container.offsetWidth;
        });

        // 加上容器之間的間隙
        totalWidth += (currentContainers.length - 1) * gap;

        // 檢查容器的可視寬度是否大於或等於所有容器的總寬度
        return currentScrollContainer.clientWidth >= totalWidth;
    }

    // 滾動到指定容器
    function scrollToContainer(index) {
        if (!currentScrollContainer || currentContainers.length === 0) return;

        if (index >= 0 && index < currentContainers.length) {
            currentIndex = index;
            const container = currentContainers[index];

            // 計算需要滾動的位置 (考慮到容器左側的間距和將容器置中)
            const scrollLeft = container.offsetLeft - (currentScrollContainer.clientWidth - container.offsetWidth) / 2;

            // 使用平滑滾動效果
            currentScrollContainer.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });

            updateButtonStatus();
        }
    }

    // 顯示上一個容器
    function showPrevContainer() {
        if (currentIndex > 0) {
            scrollToContainer(currentIndex - 1);
        }
    }

    // 顯示下一個容器
    function showNextContainer() {
        if (currentIndex < currentContainers.length - 1) {
            scrollToContainer(currentIndex + 1);
        }
    }

    // 監聽滾動事件，更新當前索引
    function handleScroll(event) {
        if (!currentScrollContainer || currentContainers.length === 0) return;

        // 計算當前滾動位置最接近哪個容器的中心
        const scrollPosition = currentScrollContainer.scrollLeft + currentScrollContainer.clientWidth / 2;

        let closestIndex = 0;
        let closestDistance = Number.MAX_VALUE;

        currentContainers.forEach((container, index) => {
            const containerCenter = container.offsetLeft + container.offsetWidth / 2;
            const distance = Math.abs(containerCenter - scrollPosition);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        // 即使當前索引未變，也強制更新按鈕狀態
        currentIndex = closestIndex;
        updateButtonStatus();
    }

    // 綁定按鈕點擊事件
    prevBtn.addEventListener('click', showPrevContainer);
    nextBtn.addEventListener('click', showNextContainer);

    // 監聽分頁切換事件
    document.addEventListener('pageChanged', function (event) {
        if (event.detail && event.detail.pageContent && event.detail.containers) {
            // 更新當前滾動容器和容器列表
            currentScrollContainer = event.detail.pageContent;
            currentContainers = Array.from(event.detail.containers);

            // 重設當前索引
            currentIndex = 0;

            // 如果只有一個容器，則置中顯示
            if (currentContainers.length === 1) {
                // 使用延遲確保 DOM 已完全更新
                setTimeout(() => {
                    centerSingleContainer();
                }, 100);
            } else if (currentContainers.length > 0) {
                // 否則滾動到第一個容器位置
                currentScrollContainer.scrollLeft = 0;
            }

            // 重新綁定滾動事件
            bindScrollEvent(currentScrollContainer);

            // 立即更新按鈕狀態
            setTimeout(updateButtonStatus, 50);
        }
    });

    // 監聽標籤頁點擊事件，確保按鈕狀態正確更新
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // 延遲執行，確保DOM已經更新
            setTimeout(() => {
                initActivePage();
            }, 100);
        });
    });

    // 綁定滾動事件
    function bindScrollEvent(container) {
        if (!container) return;

        // 移除所有頁面容器的滾動事件
        document.querySelectorAll('.page-content').forEach(content => {
            content.removeEventListener('scroll', scrollHandler);
            content.onscroll = null;
        });

        // 定義滾動處理函數
        function scrollHandler(e) {
            // 使用 requestAnimationFrame 優化性能，但保證較高頻率執行
            window.requestAnimationFrame(() => {
                // 更新當前索引
                handleScroll(e);

                // 立即更新按鈕狀態
                updateButtonStatus();
            });
        }

        // 使用 addEventListener 替代 onscroll，並在捕獲階段處理
        container.addEventListener('scroll', scrollHandler, { passive: true });

        // 初始執行一次，確保初始狀態正確
        handleScroll();
        updateButtonStatus();
    }

    // 監聽窗口大小變化，更新按鈕狀態
    window.addEventListener('resize', function () {
        updateButtonStatus();
        // 當視窗大小變化時，如果只有一個容器，重新置中
        centerSingleContainer();
    });

    // 將單一容器置中顯示
    function centerSingleContainer() {
        if (!currentScrollContainer || currentContainers.length !== 1) return;

        const container = currentContainers[0];
        const containerWidth = container.offsetWidth;
        const pageContentWidth = currentScrollContainer.clientWidth;

        // 計算需要的左側空間，使容器置中
        const marginLeft = (pageContentWidth - containerWidth) / 2;

        // 如果容器寬度小於視窗寬度，則置中顯示
        if (containerWidth < pageContentWidth) {
            // 直接設置容器的 margin 而非使用 scrollLeft
            container.style.marginLeft = `${marginLeft}px`;
            container.style.marginRight = `${marginLeft}px`;

            // 確保重置滾動位置
            currentScrollContainer.scrollLeft = 0;
        } else {
            // 如果容器寬度大於視窗寬度，則使用原來的滾動方式
            const scrollLeft = container.offsetLeft - (pageContentWidth - containerWidth) / 2;
            currentScrollContainer.scrollTo({
                left: Math.max(0, scrollLeft),
                behavior: 'smooth'
            });
        }
    }
}

export default leftRightBtnController;