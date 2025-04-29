/**
 * 左右切換按鈕功能
 * 讓使用者可以切換不同的容器，將當前容器置中顯示
 * 同時保留完整的水平滾動功能，不限制用戶的滾動範圍
 * 支持在不同分頁內進行滑動
 */
document.addEventListener('DOMContentLoaded', function() {
    // 獲取所有容器與按鈕元素
    const app = document.getElementById('app');
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
        
        if (closestIndex !== currentIndex) {
            currentIndex = closestIndex;
            updateButtonStatus();
        }
    }
    
    // 綁定按鈕點擊事件
    prevBtn.addEventListener('click', showPrevContainer);
    nextBtn.addEventListener('click', showNextContainer);
    
    // 監聽分頁切換事件
    document.addEventListener('pageChanged', function(event) {
        if (event.detail && event.detail.pageContent && event.detail.containers) {
            // 更新當前滾動容器和容器列表
            currentScrollContainer = event.detail.pageContent;
            currentContainers = Array.from(event.detail.containers);
            
            // 重設當前索引
            currentIndex = 0;
            
            // 直接滾動到第一個容器位置
            if (currentContainers.length > 0) {
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
        btn.addEventListener('click', function() {
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
            content.onscroll = null;
        });
        
        // 為當前頁面容器添加滾動事件
        let isScrolling;
        container.onscroll = function(e) {
            // 清除先前的計時器
            window.clearTimeout(isScrolling);
            
            // 設置新的計時器，延遲執行避免頻繁運算
            isScrolling = setTimeout(function() {
                handleScroll(e);
            }, 50);
        };
    }
    
    // 監聽窗口大小變化，更新按鈕狀態
    window.addEventListener('resize', function() {
        updateButtonStatus();
    });
});