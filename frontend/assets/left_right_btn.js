/**
 * 左右切換按鈕功能
 * 讓使用者可以切換不同的容器，將當前容器置中顯示
 */
document.addEventListener('DOMContentLoaded', function() {
    // 獲取所有容器與按鈕元素
    const containers = document.querySelectorAll('.container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    // 目前顯示的容器索引
    let currentIndex = 0;
    
    // 初始化：只顯示第一個容器
    function initContainers() {
        containers.forEach((container, index) => {
            if (index !== currentIndex) {
                container.classList.add('hidden');
            } else {
                container.classList.remove('hidden');
            }
        });
        updateButtonStatus();
    }
    
    // 更新按鈕狀態（第一個容器時禁用上一步，最後一個容器時禁用下一步）
    function updateButtonStatus() {
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
    
    // 顯示上一個容器
    function showPrevContainer() {
        if (currentIndex > 0) {
            containers[currentIndex].classList.add('hidden');
            currentIndex--;
            containers[currentIndex].classList.remove('hidden');
            updateButtonStatus();
        }
    }
    
    // 顯示下一個容器
    function showNextContainer() {
        if (currentIndex < containers.length - 1) {
            containers[currentIndex].classList.add('hidden');
            currentIndex++;
            containers[currentIndex].classList.remove('hidden');
            updateButtonStatus();
        }
    }
    
    // 綁定按鈕點擊事件
    prevBtn.addEventListener('click', showPrevContainer);
    nextBtn.addEventListener('click', showNextContainer);
    
    // 初始化容器顯示狀態
    initContainers();
    
    // 若只有一個容器，隱藏按鈕
    if (containers.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
});