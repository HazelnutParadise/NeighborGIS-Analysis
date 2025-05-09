import AddressPointRecords from './record_list.js';

const SEARCH_BTN = document.getElementById('searchBtn');
const RESULT_DIV = document.getElementById('result');

// Leaflet 地圖初始化
export let map = L.map('map').setView([23.5, 121], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
let marker;
let poiLayer;

SEARCH_BTN.addEventListener('click', async () => {
    // 顯示進度條
    await fetchAddressPointInfo();
});

function showAddressPointResult(data) {
    const coordinates = data.coordinates;
    const lat = Number(coordinates.lat);
    const lng = Number(coordinates.lng);
    const zoning = data.zoning;
    RESULT_DIV.innerText =
        `${data.address}\n` +
        `經度：${lng}\n` +
        `緯度：${lat}\n` +
        `使用分區：${zoning.zone && zoning.zone !== '無資料' ? zoning.zone : '無資料'}\n` +
        `容積率：${zoning.far && zoning.far !== '無資料' ? `${zoning.far}%` : '無資料'}\n` +
        `建蔽率：${zoning.bcr && zoning.bcr !== '無資料' ? `${zoning.bcr}%` : '無資料'}\n` +
        // 若查不到使用分區，則判定該點不在台北市，顯示為無資料
        `是否為公有地：${zoning.is_public_land && zoning.zone ? (zoning.is_public_land === "Y" ? '是' : '否') : '無資料'}`;

    // 標記地圖
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(data.address).openPopup();
        map.setView([lat, lng], 16);
    } else {
        if (marker) {
            map.removeLayer(marker);
            marker = null;
        }
    }
}

function addPoiLayer(data) {
    if (poiLayer) {
        map.removeLayer(poiLayer);
    }
    // 根據 POI 類型決定顏色
    const colorMap = {
        food: 'lightblue',
        health: 'lightgreen',
        public: 'orange',
    };
    // 加入 GeoJSON Layer
    poiLayer = L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            const color = colorMap[feature.properties.poi_type] || 'black';
            const name = feature.properties.name || '未命名';
            const addr = feature.properties["addr:full"] || '無地址';
            return L.circleMarker(latlng, {
                radius: 3.5,
                fillColor: color,
                color: 'black',
                weight: 0.5,
                fillOpacity: 0.8
            }).bindPopup(`<b>${name}</b><br>${addr}`);
        }
    }).addTo(map);
}

function showPoiAnalysisResult(resData) {
    const nearbyAnalysisResultDiv = document.getElementById('nearby-analysis-result');
    // 更新 UI 以顯示分析結果
    let analysisHtml = '<div class="analysis-container">';

    // 處理各個 POI 類型的分析
    if (resData.analysis && resData.analysis.length > 0) {
        resData.analysis.forEach(poiAnalysis => {
            analysisHtml += `
                <div class="poi-analysis-card">
                    <div class="poi-type-header">
                        <h3 class="poi-type">${poiAnalysis.poi_type}</h3>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="analysis-sections">
                        <div class="analysis-row">
                            <div class="analysis-column advantages-column">
                                <div class="column-header advantages-header">
                                    <h4>優 勢</h4>
                                </div>
                                <div class="column-content">
                                    <ul class="advantages-list">
                                        ${poiAnalysis.advantages.map(adv => `<li>${adv}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                            <div class="analysis-column disadvantages-column">
                                <div class="column-header disadvantages-header">
                                    <h4>劣 勢</h4>
                                </div>
                                <div class="column-content">
                                    <ul class="disadvantages-list">
                                        ${poiAnalysis.disadvantages.map(dis => `<li>${dis}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        analysisHtml += '<p>無分析數據</p>';
    }

    // 添加總結
    if (resData.summary) {
        analysisHtml += `
            <div class="summary-section">
                <h3>總結分析</h3>
                <p>${resData.summary}</p>
            </div>
            <br>
        `;
    }

    analysisHtml += '</div>';
    nearbyAnalysisResultDiv.innerHTML = analysisHtml;

    // 添加可收合功能
    setupCollapsibleSections();
}

// 設定可收合區塊的功能
function setupCollapsibleSections() {
    // 只設置 POI 類型的可收合功能
    const poiTypeHeaders = document.querySelectorAll('.poi-type-header');
    poiTypeHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const analysisSection = this.nextElementSibling;
            const icon = this.querySelector('.toggle-icon');

            // 切換內容展開/收合狀態
            analysisSection.classList.toggle('collapsed');
            icon.classList.toggle('collapsed');
        });
    });
}

async function fetchAddressPointInfo(userCoordinates) {
    const original_btn_text = SEARCH_BTN.innerText;
    const original_result_text = RESULT_DIV.innerText;
    SEARCH_BTN.disabled = true;
    SEARCH_BTN.innerText = '查詢中...';
    RESULT_DIV.innerHTML = SPINNER_HTML;
    const address = document.getElementById('address').value;
    let url;
    if (!userCoordinates) {
        if (!address) {
            SEARCH_BTN.disabled = false;
            SEARCH_BTN.innerText = original_btn_text;
            RESULT_DIV.innerText = original_result_text;
            return alert('請輸入地址');
        }
        url = `/api/intersect/${encodeURIComponent(address)}`;
    } else {
        url = `/api/intersect/${encodeURIComponent(userCoordinates.lat)},${encodeURIComponent(userCoordinates.lng)}?use_coordinates=true`;
    }
    progress_bar.show();
    let lat, lng;
    let data, zoning = null;
    try {
        const res = await fetch(url)
        const resJson = await res.json();
        if (!res.ok) {
            RESULT_DIV.innerHTML = `查詢失敗，伺服器 ${res.status}`;
            throw new Error(`查詢失敗，伺服器 ${res.status}` + resJson ? `\n${resJson.message}` : '');
        }
        data = resJson.data;
        const coordinates = data.coordinates;
        lat = Number(coordinates.lat);
        lng = Number(coordinates.lng);
        zoning = data.zoning;
        showAddressPointResult(data);
    }
    catch (error) {
        RESULT_DIV.innerHTML = `查詢失敗，錯誤訊息： ${error.message}`;
        alert(`查詢失敗，錯誤訊息： ${error.message}`);
        console.error('Error:', error);
        SEARCH_BTN.innerText = original_btn_text;
        SEARCH_BTN.disabled = false;
        progress_bar.hide();
        return;
    }
    const poi_data = await fetchAddressPointNearbyPOI(lat, lng);
    let addressPointData = {
        address: data.address,
        lat: lat,
        lng: lng,
        zoning: zoning.zone ? zoning.zone : '無資料',
        far: zoning.far ? `${zoning.far}` : '無資料',
        bcr: zoning.bcr ? `${zoning.bcr}` : '無資料',
        is_public_land: zoning.is_public_land && zoning.zone ? (zoning.is_public_land === "Y" ? '是' : '否') : '無資料',
        nearby_poi: poi_data,
    }
    const nearby_analysis_data = await fetchNearbyAnalysis(addressPointData, original_btn_text);
    addressPointData.nearby_analysis_data = nearby_analysis_data;
    AddressPointRecords().add(addressPointData);
}

async function fetchAddressPointNearbyPOI(lat, lng) {
    const url = `/api/nearby-poi/${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    try {
        const res = await fetch(url);
        const resJson = await res.json();
        if (!res.ok) {
            throw new Error(`查詢失敗，伺服器 ${res.status}` + resJson ? `\n${resJson.message}` : '');
        }
        const data = resJson.data;
        console.table(data)
        if (data.length === 0) {
            SEARCH_BTN.innerText = original_btn_text;
            SEARCH_BTN.disabled = false;
            progress_bar.hide();
            return;
        }
        addPoiLayer(data);
        return data;
    } catch (error) {
        alert(error.message);
    }
}

async function fetchNearbyAnalysis(data, original_btn_text) {
    const nearbyAnalysisResultDiv = document.getElementById('nearby-analysis-result');
    try {
        nearbyAnalysisResultDiv.innerHTML = SPINNER_HTML;
        const res = await fetch(`/api/nearby-analysis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const resJson = await res.json();
        if (!res.ok) {
            nearbyAnalysisResultDiv.innerHTML = `查詢失敗，伺服器 ${res.status}`;
            throw new Error(`查詢失敗，伺服器 ${res.status}` + resJson ? `\n${resJson.message}` : '');
        }
        const resData = resJson.data;
        console.table(resData)

        showPoiAnalysisResult(resData);
        return resData;
    } catch (error) {
        nearbyAnalysisResultDiv.innerHTML = `查詢失敗，錯誤訊息： ${error.message}`;
        alert(`查詢失敗，錯誤訊息： ${error.message}`);
        console.error('Error:', error);
    }
    finally {
        SEARCH_BTN.innerText = original_btn_text;
        SEARCH_BTN.disabled = false;
        progress_bar.hide();
    }
}

export { fetchAddressPointInfo, showAddressPointResult, addPoiLayer, showPoiAnalysisResult };