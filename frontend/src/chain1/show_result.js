import { map } from './map';
import { on, getEl } from "../dom";

let marker;
let circle;
let poiLayer;

export const showAddressPointResult = (data) => {
    const RESULT_DIV = getEl('#result');
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

export const drawDistanceCircle = (lat, lng) => {
    const distance = 500; // 半徑 500 公尺
    if (circle) {
        map.removeLayer(circle);
    }
    circle = L.circle([lat, lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: distance
    }).addTo(map);
    // 設定圓圈的 popup
    circle.bindPopup(`距離：${distance} 公尺`);
}

export const addPoiLayer = (data) => {
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

export const showPoiAnalysisResult = (resData) => {
    const nearbyAnalysisResultDiv = getEl('#nearby-analysis-result');
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
        on(header, 'click', function () {
            const analysisSection = this.nextElementSibling;
            const icon = this.querySelector('.toggle-icon');

            // 切換內容展開/收合狀態
            analysisSection.classList.toggle('collapsed');
            icon.classList.toggle('collapsed');
        });
    });
}