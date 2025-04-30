document.addEventListener('DOMContentLoaded', function() {
    // 尋找所有具有 required 屬性的元素
    const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    
    requiredInputs.forEach(function(input) {
        // 尋找與輸入框相關聯的標籤
        let label;
        
        // 如果輸入框有 id，尋找 for 屬性匹配的標籤
        if (input.id) {
            label = document.querySelector(`label[for="${input.id}"]`);
        }
        
        // 如果沒有找到標籤，查看父元素是否為標籤
        if (!label && input.parentElement.tagName === 'LABEL') {
            label = input.parentElement;
        }
        
        // 如果標籤存在，添加紅色星號
        if (label) {
            if (!label.innerHTML.includes('*')) {
                const asterisk = document.createElement('span');
                asterisk.textContent = ' *';
                asterisk.style.color = 'red';
                asterisk.style.fontWeight = 'bold';
                label.appendChild(asterisk);
            }
        } else {
            // 如果找不到標籤，可以在輸入框後直接添加星號
            const wrapper = document.createElement('div');
            wrapper.style.display = 'inline-block';
            wrapper.style.position = 'relative';
            
            // 取得輸入框的父元素
            const parent = input.parentElement;
            
            // 在輸入框的位置插入包裝器
            parent.insertBefore(wrapper, input);
            
            // 將輸入框移至包裝器內
            wrapper.appendChild(input);
            
            // 創建並添加星號
            const asterisk = document.createElement('span');
            asterisk.textContent = '*';
            asterisk.style.color = 'red';
            asterisk.style.fontWeight = 'bold';
            asterisk.style.position = 'absolute';
            asterisk.style.top = '0';
            asterisk.style.right = '-10px';
            wrapper.appendChild(asterisk);
        }
    });
});