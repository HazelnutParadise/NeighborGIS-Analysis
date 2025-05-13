import { on, once, getEl } from '../dom.js';
import SpinnerHTML from '../components/spinner.js';
import { showAddressPointResult, drawDistanceCircle, addPoiLayer, showPoiAnalysisResult } from './show_result.js';
/**
 * 地點查詢紀錄功能
 * 處理記錄顯示、清除、選擇和比較功能
 */

// 變數宣告
const addressPointList = [];
// 已選擇的地址記錄（用於比較功能）
let selectedAddressesIdx = [];

// DOM元素
const AddressPointRecords = (() => {
    const addressRecordList = getEl('#addressRecordList');
    // 模態框元素參考
    let compareModal = null;
    let compareModalContent = null;
    let compareId = 0; // 用於生成唯一ID

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
                    <svg xmlns="http://www.w3.org/2000/svg" width="10px" height="10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: -4px; color: var(--interactive-color-2);">
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

            // 檢查該記錄是否已經在選擇列表中，如果是，則自動勾選
            let isSelected = selectedAddressesIdx.includes(index);
            checkbox.checked = isSelected;

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
                    <span>容積率: ${point.far + (point.far !== '無資料' ? '%' : '')}</span>
                    <span>建蔽率: ${point.bcr + (point.bcr !== '無資料' ? '%' : '')}</span>
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
                const data = {
                    address: point.address,
                    coordinates: {
                        lat: point.lat,
                        lng: point.lng,
                    },
                    zoning: {
                        zone: point.zoning,
                        far: point.far,
                        bcr: point.bcr,
                    },
                    is_public_land: point.is_public_land,
                    nearby_poi: point.nearby_poi,
                    nearby_analysis_data: point.nearby_analysis_data,
                };
                showAddressPointResult(data);
                drawDistanceCircle(point.lat, point.lng);
                addPoiLayer(point.nearby_poi);
                showPoiAnalysisResult(data.nearby_analysis_data);
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
            if (!selectedAddressesIdx.includes(index)) {
                selectedAddressesIdx.push(index);
            }
        } else {
            // 從選擇列表中移除索引
            const indexPosition = selectedAddressesIdx.indexOf(index);
            if (indexPosition !== -1) {
                selectedAddressesIdx.splice(indexPosition, 1);
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
        const indexPosition = selectedAddressesIdx.indexOf(index);
        if (indexPosition !== -1) {
            selectedAddressesIdx.splice(indexPosition, 1);
        }

        // 更新選擇列表中其他記錄的索引（刪除一項後，後面的記錄索引會減1）
        for (let i = 0; i < selectedAddressesIdx.length; i++) {
            if (selectedAddressesIdx[i] > index) {
                selectedAddressesIdx[i]--;
            }
        }

        // 從記錄列表中移除
        addressPointList.splice(index, 1);

        // 更新顯示
        updateRecordList();
    }

    function deselectAll() {
        // 全不選
        selectedAddressesIdx.length = 0;
        updateRecordList();
    }

    function selectAll() {
        // 全選
        selectedAddressesIdx = addressPointList.map((_, index) => index);
        updateRecordList();
    }

    function clearAll() {
        if (addressPointList.length === 0) return;

        if (confirm('確定要清除全部記錄嗎？')) {
            addressPointList.length = 0;
            selectedAddressesIdx.length = 0;
            updateRecordList();
        }
    }

    /**
     * 創建比較模態框 - 只在初始化時創建一次
     */
    function initCompareModal() {
        // 檢查是否已存在模態框
        if (document.getElementById('compareModal')) {
            return;
        }

        // 創建模態框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'compareModal';

        // 設置模態框樣式，使其有適當的捲軸空間
        modal.style.paddingLeft = '15px';
        modal.style.paddingRight = '15px';

        const modalContent = document.createElement('div');
        modalContent.className = 'compare-modal';
        modalContent.style.maxWidth = 'calc(100% - 30px)'; // 確保兩側有足夠空間
        modalContent.style.overflowY = 'auto'; // 整個模態框可捲動

        // 初始化一個空的內容區域，稍後會更新
        modalContent.innerHTML = `
            <div class="compare-header">
                <h3>地點比較</h3>
                <button class="close-btn" id="closeAddressPointRecordsCompareModalBtn">×</button>
            </div>
            <div class="compare-body" id="compareModalBody">
                <!-- 動態內容將在這裡更新 -->
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 綁定關閉按鈕事件，只綁定一次
        const closeBtn = getEl('#closeAddressPointRecordsCompareModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCompareModal);
        }

        // 保存對模態框的引用
        compareModal = modal;
        compareModalContent = getEl('#compareModalBody');

        return modal;
    }

    /**
     * 生成比較內容HTML
     * @param {Array} selectedAddresses - 選中的地址列表
     * @returns {String} 比較內容HTML
     */
    function generateCompareContent(selectedAddresses, currentCompareId) {
        return `
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
                        ${selectedAddresses.map(addr => `<td>${addr.far + (addr.far !== '無資料' ? '%' : '')}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>建蔽率</td>
                        ${selectedAddresses.map(addr => `<td>${addr.bcr + (addr.bcr !== '無資料' ? '%' : '')}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>公有地</td>
                        ${selectedAddresses.map(addr => `<td>${addr.is_public_land}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>周邊POI數量</td>
                        ${selectedAddresses.map(addr => `<td>${addr.nearby_poi.features.length}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
            <div class="compare-summary">
                <h4 class="tag">比較結果分析</h4>
                <div id="compareSummary_${currentCompareId}" class="summary-content compare-summary-content">
                    ${SpinnerHTML}
                </div>
            </div>
        `;
    }

    /**
     * 比較選中的地址
     */
    function compareAddresses() {
        if (selectedAddressesIdx.length < 2) {
            alert('請至少選擇兩個地址進行比較');
            return;
        }

        // 增加比較ID
        compareId++;
        const currentCompareId = compareId;

        // 獲取選中地址的詳細信息
        const selectedAddresses = selectedAddressesIdx.map(idx => addressPointList[idx]);

        // 生成比較內容，使用當前的compareId
        const compareContent = generateCompareContent(selectedAddresses, currentCompareId);

        // 更新模態框內容
        compareModalContent.innerHTML = compareContent;

        // 顯示模態框
        document.body.classList.add('modal-open');
        compareModal.classList.add('show');

        // 直接使用當前compareId獲取summary元素
        const summaryElementId = `compareSummary_${currentCompareId}`;

        // 取得比較結果
        getCompareSummary(selectedAddresses).then((summary) => {
            // 為比較結果添加高亮顯示
            const formattedSummary = formatComparisonResult(summary);

            // 使用ID選擇器確保找到正確的元素
            const currentSummaryElement = document.getElementById(summaryElementId);
            if (currentSummaryElement) {
                currentSummaryElement.innerHTML = formattedSummary;
            } else {
                console.error(`無法找到比較結果元素: ${summaryElementId}`);
            }
        }).catch(error => {
            const currentSummaryElement = document.getElementById(summaryElementId);
            if (currentSummaryElement) {
                currentSummaryElement.innerHTML = '<p class="error-message">獲取比較結果時出錯</p>';
            }
            console.error('比較請求失敗:', error);
        });
    }

    async function getCompareSummary(data) {
        try {
            const result = await fetch('/api/compare-points', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!result.ok) {
                console.error('Error fetching compare summary:', result.statusText);
                return '無法獲取比較結果';
            }
            const resultJson = await result.json();
            return resultJson.data;
        } catch (error) {
            console.error('Error fetching compare summary:', error);
            return '無法獲取比較結果';
        }
    }

    /**
     * 格式化比較結果，添加高亮顯示
     */
    function formatComparisonResult(summary) {
        if (!summary || typeof summary !== 'string') return '無法獲取比較結果';

        // 添加高亮標記
        let formattedText = summary
            // 高亮正面評價詞彙
            .replace(/更好|較佳|優勢|有利|推薦|適合|理想|優點|較高|較多/g, match => `<span class="highlight-better">${match}</span>`)
            // 高亮負面評價詞彙
            .replace(/較差|不足|劣勢|不利|不推薦|不適合|問題|缺點|較低|較少/g, match => `<span class="highlight-worse">${match}</span>`)
            // 高亮中性評價詞彙
            .replace(/相似|差異|不同|各有|可能|視情況/g, match => `<span class="highlight-neutral">${match}</span>`);

        // 確保段落正確換行
        formattedText = formattedText.replace(/\n/g, '</p><p>');

        return `<p>${formattedText}</p>`;
    }

    /**
     * 關閉比較模態框
     */
    function closeCompareModal() {
        if (compareModal) {
            compareModal.classList.remove('show');
            // 解除背景滾動鎖定
            document.body.classList.remove('modal-open');
        }
    }

    return {
        init: () => {
            const selectAllBtn = getEl('#selectAllBtn');
            const deselectAllBtn = getEl('#deselectAllBtn');
            const clearAllBtn = getEl('#clearAllBtn');
            const compareBtn = getEl('#compareBtn');

            on(selectAllBtn, 'click', selectAll);
            on(deselectAllBtn, 'click', deselectAll);
            on(clearAllBtn, 'click', clearAll);

            // 綁定比較按鈕事件
            on(compareBtn, 'click', compareAddresses);

            // 初始化模態框
            initCompareModal();

            // 初始化記錄列表
            updateRecordList();
        },
        add: (address) => {
            addressPointList.push(address);
            updateRecordList();
        },
        clearAll,
        selectAll,
        deselectAll,
        getSelected: () => {
            // 返回選中的地址列表，包含所有地址的詳細信息
            return selectedAddressesIdx.map(idx => addressPointList[idx]);
        },
        closeCompareModal,
        compareSelectedAddresses: compareAddresses,
    };
})();

AddressPointRecords.init();

export default AddressPointRecords;