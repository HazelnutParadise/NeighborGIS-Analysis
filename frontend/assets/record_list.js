/**
 * 地點查詢紀錄功能
 * 處理記錄顯示、清除、選擇和比較功能
 */

// DOM元素
const addressRecordList = document.getElementById('addressRecordList');
const clearAllBtn = document.getElementById('clearAllBtn');
const compareBtn = document.getElementById('compareBtn');

// 已選擇的地址記錄（用於比較功能）
let selectedAddresses = [];

/**
 * 更新記錄列表顯示
 */
function updateRecordList() {
    // 清空列表
    addressRecordList.innerHTML = '';
    
    if (addressPointList.length === 0) {
        addressRecordList.innerHTML = '無紀錄';
        compareBtn.disabled = true;
        return;
    }
    
    // 為每個地址點創建列表項
    addressPointList.forEach((point, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'record-item';
        listItem.setAttribute('data-index', index);
        
        // 創建選擇框
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'record-checkbox';
        checkbox.onchange = function() {
            handleRecordSelection(index, this.checked);
        };
        
        // 創建地址信息區域
        const infoDiv = document.createElement('div');
        infoDiv.className = 'record-info';
        infoDiv.innerHTML = `
            <div class="record-title">${point.address}</div>
            <div class="record-details">
                <span>使用分區: ${point.zoning}</span>
                <span>容積率: ${point.far}</span>
                <span>建蔽率: ${point.bcr}</span>
                <span>公有地: ${point.is_public_land}</span>
            </div>
        `;
        
        // 創建刪除按鈕
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            deleteRecord(index);
        };
        
        // 將元素添加到列表項
        listItem.appendChild(checkbox);
        listItem.appendChild(infoDiv);
        listItem.appendChild(deleteBtn);
        
        // 點擊整個區域時在地圖上顯示該點
        infoDiv.onclick = function() {
            showPointOnMap(point);
        };
        
        addressRecordList.appendChild(listItem);
    });
    
    // 根據選擇數量更新比較按鈕狀態
    updateCompareButtonState();
}

/**
 * 處理記錄選擇狀態變化
 */
function handleRecordSelection(index, isSelected) {
    if (isSelected) {
        // 添加到選擇列表
        selectedAddresses.push(addressPointList[index]);
    } else {
        // 從選擇列表中移除
        const selectedIndex = selectedAddresses.findIndex(addr => 
            addr.address === addressPointList[index].address &&
            addr.lat === addressPointList[index].lat &&
            addr.lng === addressPointList[index].lng
        );
        if (selectedIndex !== -1) {
            selectedAddresses.splice(selectedIndex, 1);
        }
    }
    
    // 更新比較按鈕狀態
    updateCompareButtonState();
}

/**
 * 更新比較按鈕狀態
 */
function updateCompareButtonState() {
    // 當選擇2個以上地址時啟用比較按鈕
    compareBtn.disabled = selectedAddresses.length < 2;
}

/**
 * 刪除單條記錄
 */
function deleteRecord(index) {
    // 如果該記錄已被選中，也從選擇列表中移除
    const point = addressPointList[index];
    const selectedIndex = selectedAddresses.findIndex(addr => 
        addr.address === point.address &&
        addr.lat === point.lat &&
        addr.lng === point.lng
    );
    
    if (selectedIndex !== -1) {
        selectedAddresses.splice(selectedIndex, 1);
    }
    
    // 從記錄列表中移除
    addressPointList.splice(index, 1);
    
    // 更新顯示
    updateRecordList();
}

/**
 * 在地圖上顯示選中的點
 */
function showPointOnMap(point) {
    if (point.lat && point.lng && !isNaN(point.lat) && !isNaN(point.lng)) {
        if (marker) map.removeLayer(marker);
        marker = L.marker([point.lat, point.lng]).addTo(map);
        marker.bindPopup(point.address).openPopup();
        map.setView([point.lat, point.lng], 16);
    }
}

/**
 * 比較選中的地址
 */
function compareAddresses() {
    if (selectedAddresses.length < 2) {
        alert('請至少選擇兩個地址進行比較');
        return;
    }
    
    // 創建比較表格
    let compareContent = `
        <div class="compare-modal">
            <div class="compare-header">
                <h3>地址比較</h3>
                <button class="close-btn" onclick="closeCompareModal()">×</button>
            </div>
            <table class="compare-table">
                <thead>
                    <tr>
                        <th>比較項目</th>
                        ${selectedAddresses.map(addr => `<th>${addr.address}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>使用分區</td>
                        ${selectedAddresses.map(addr => `<td>${addr.zoning}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>容積率</td>
                        ${selectedAddresses.map(addr => `<td>${addr.far}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>建蔽率</td>
                        ${selectedAddresses.map(addr => `<td>${addr.bcr}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>公有地</td>
                        ${selectedAddresses.map(addr => `<td>${addr.is_public_land}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // 創建模態框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'compareModal';
    modal.innerHTML = compareContent;
    document.body.appendChild(modal);
    
    // 顯示模態框
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

/**
 * 關閉比較模態框
 */
function closeCompareModal() {
    const modal = document.getElementById('compareModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }
}

// 綁定清除全部按鈕事件
clearAllBtn.addEventListener('click', () => {
    if (addressPointList.length === 0) return;
    
    if (confirm('確定要清除全部記錄嗎？')) {
        addressPointList.length = 0;
        selectedAddresses.length = 0;
        updateRecordList();
    }
});

// 綁定比較按鈕事件
compareBtn.addEventListener('click', compareAddresses);

// 當地址列表更新時，更新記錄顯示
// 使用 MutationObserver 監控 addressPointList 變化
// 由於 addressPointList 是普通陣列，無法直接監控，這裡在每次搜尋後手動調用
document.getElementById('searchBtn').addEventListener('click', () => {
    // 使用 setTimeout 確保在地址查詢完成後更新列表
    setTimeout(() => {
        updateRecordList();
    }, 2000);
});

// 初始化記錄列表
updateRecordList();