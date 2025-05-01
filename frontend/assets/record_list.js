/**
 * 地點查詢紀錄功能
 * 處理記錄顯示、清除、選擇和比較功能
 */

// DOM元素
const AddressPointRecords = () => {
    /**
     * 更新記錄列表顯示
     */
    function updateRecordList() {
        // 清空列表
        addressRecordList.innerHTML = '';

        if (addressPointList.length === 0) {
            // 優化無紀錄的顯示樣式
            addressRecordList.innerHTML = `
                <div class="empty-record-notice">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: -4px; color: var(--interactive-color-2);">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    尚無查詢紀錄
                </div>`;
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
            checkbox.onchange = function () {
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
            deleteBtn.onclick = function (e) {
                e.stopPropagation();
                deleteRecord(index);
            };

            // 將元素添加到列表項
            listItem.appendChild(checkbox);
            listItem.appendChild(infoDiv);
            listItem.appendChild(deleteBtn);

            // 點擊整個區域時在地圖上顯示該點
            infoDiv.onclick = function () {
                showPointOnMap(point);
            };

            addressRecordList.appendChild(listItem);
        });   // 根據選擇數量更新比較按鈕狀態
        updateCompareButtonState();
    }

    /**
     * 處理記錄選擇狀態變化
     */
    function handleRecordSelection(index, isSelected) {
        if (isSelected) {
            // 添加到選擇列表
            selectedAddressesIdx.push(addressPointList[index]);
        } else {
            // 從選擇列表中移除
            const selectedIndex = selectedAddressesIdx.findIndex(addr =>
                addr.address === addressPointList[index].address &&
                addr.lat === addressPointList[index].lat &&
                addr.lng === addressPointList[index].lng
            );
            if (selectedIndex !== -1) {
                selectedAddressesIdx.splice(selectedIndex, 1);
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
        compareBtn.disabled = selectedAddressesIdx.length < 2;
    }

    /**
     * 刪除單條記錄
     */
    function deleteRecord(index) {
        // 如果該記錄已被選中，也從選擇列表中移除
        const point = addressPointList[index];
        const selectedIndex = selectedAddressesIdx.findIndex(addr =>
            addr.address === point.address &&
            addr.lat === point.lat &&
            addr.lng === point.lng
        );

        if (selectedIndex !== -1) {
            selectedAddressesIdx.splice(selectedIndex, 1);
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
        if (selectedAddressesIdx.length < 2) {
            alert('請至少選擇兩個地址進行比較');
            return;
        }

        // 創建比較表格
        let compareContent = `
            <div class="compare-modal">
                <div class="compare-header">
                    <h3>地址比較</h3>
                    <button class="close-btn" onclick="records().closeCompareModal()">×</button>
                </div>
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th>比較項目</th>
                            ${selectedAddressesIdx.map(addr => `<th>${addr.address}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>使用分區</td>
                            ${selectedAddressesIdx.map(addr => `<td>${addr.zoning}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>容積率</td>
                            ${selectedAddressesIdx.map(addr => `<td>${addr.far}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>建蔽率</td>
                            ${selectedAddressesIdx.map(addr => `<td>${addr.bcr}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>公有地</td>
                            ${selectedAddressesIdx.map(addr => `<td>${addr.is_public_land}</td>`).join('')}
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
    return {
        init: () => {
            const compareBtn = document.getElementById('compareBtn');

            // 綁定比較按鈕事件
            compareBtn.addEventListener('click', compareAddresses);

            // 初始化記錄列表
            updateRecordList();
        },
        add: (address) => {
            addressPointList.push(address);
            updateRecordList();
        },
        clearAll: () => {
            if (addressPointList.length === 0) return;

            if (confirm('確定要清除全部記錄嗎？')) {
                addressPointList.length = 0;
                selectedAddressesIdx.length = 0;
                updateRecordList();
            }
        },
        getSelected: () => {
            // 返回選中的地址列表，包含所有地址的詳細信息
            let selectedDetails = selectedAddressesIdx.map(idx => {
                const point = addressPointList[idx];
                return point ? { ...point } : undefined;
            });
            return selectedDetails.filter(point => point !== undefined);
        },
        closeCompareModal,
    }
}
