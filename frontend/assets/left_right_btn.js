/**
 * 左右切換按鈕功能
 * 讓使用者可以切換不同的容器，將當前容器置中顯示
 * 同時保留完整的水平滾動功能，不限制用戶的滾動範圍
 */
document.addEventListener('DOMContentLoaded', function() {
    // 獲取所有容器與按鈕元素
    const containers = document.querySelectorAll('.container');
    const app = document.getElementById('app');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    // 目前最接近中心的容器索引
    let currentIndex = 0;
    
    // 初始化按鈕狀態
    function updateButtonStatus() {
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
            nextBtn.disabled = currentIndex === containers.length - 1;
            
            // 視覺上的禁用效果
            if (prevBtn.disabled) {
                prevBtn.style.opacity = '0.5';
            } else {
                prevBtn.style.opacity = '1';
            }
            
            if (nextBtn.disabled) {
                nextBtn.style.opacity = '0.5';
            } else {
                nextBtn.style.opacity = '1';
            }
        }
    }
    
    // 檢查是否所有容器都能完整顯示
    function checkAllContainersVisible() {
        if (containers.length === 0) return true;
        
        // 計算所有容器的總寬度，包含間隙
        let totalWidth = 0;
        const gap = 10; // 容器之間的間隙，與CSS中的gap值保持一致
        
        containers.forEach((container) => {
            totalWidth += container.offsetWidth;
        });
        
        // 加上容器之間的間隙
        totalWidth += (containers.length - 1) * gap;
        
        // 檢查app的可視寬度是否大於或等於所有容器的總寬度
        return app.clientWidth >= totalWidth;
    }
    
    // 滾動到指定容器
    function scrollToContainer(index) {
        if (index >= 0 && index < containers.length) {
            currentIndex = index;
            const container = containers[index];
            
            // 計算需要滾動的位置 (考慮到容器左側的間距和將容器置中)
            const scrollLeft = container.offsetLeft - (app.clientWidth - container.offsetWidth) / 2;
            
            // 使用平滑滾動效果
            app.scrollTo({
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
        if (currentIndex < containers.length - 1) {
            scrollToContainer(currentIndex + 1);
        }
    }
    
    // 監聽滾動事件，更新當前索引
    function handleScroll() {
        // 計算當前滾動位置最接近哪個容器的中心
        const scrollPosition = app.scrollLeft + app.clientWidth / 2;
        
        let closestIndex = 0;
        let closestDistance = Number.MAX_VALUE;
        
        containers.forEach((container, index) => {
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
    
    // 綁定滾動事件，使用節流來優化性能
    let isScrolling;
    app.addEventListener('scroll', function() {
        // 清除先前的計時器
        window.clearTimeout(isScrolling);
        
        // 設置新的計時器，延遲執行避免頻繁運算
        isScrolling = setTimeout(handleScroll, 50);
    });
    
    // 監聽窗口大小變化，更新按鈕狀態
    window.addEventListener('resize', function() {
        updateButtonStatus();
    });
    
    // 初始化按鈕狀態
    updateButtonStatus();
    
    // 若只有一個容器，隱藏按鈕
    if (containers.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
});