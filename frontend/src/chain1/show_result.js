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

    // 改進視覺效果
    circle = L.circle([lat, lng], {
        color: '#4285F4',         // Google 藍色
        weight: 1,                // 線條粗細
        fillColor: '#4285F4',     // 填充顏色
        fillOpacity: 0.15,        // 提高透明度以便更好地看到地圖
        radius: distance,
        // 增加互動效果
        interactive: true
    }).addTo(map);

    // 建立彈出視窗內容
    const popupContent = `
        <div style="text-align: center;">
            <strong>步行範圍</strong><br>
            半徑：${distance} 公尺<br>
            <small>約 ${Math.round(distance / 80)} 分鐘步行距離</small>
        </div>`;

    // 建立跟隨滑鼠的工具提示，不使用標準的 popup
    let tooltip = L.tooltip({
        permanent: false,
        direction: 'top',
        className: 'custom-tooltip',
        offset: [0, -10],
        opacity: 0.9
    });

    // 滑鼠移入時顯示工具提示
    circle.on('mouseover', function (e) {
        tooltip
            .setContent(popupContent)
            .setLatLng(e.latlng)
            .addTo(map);
    });

    // 滑鼠移動時更新工具提示位置
    circle.on('mousemove', function (e) {
        tooltip.setLatLng(e.latlng);
    });

    // 滑鼠移出時移除工具提示
    circle.on('mouseout', function () {
        map.closeTooltip(tooltip);
    });

    // 鼠標點擊圓形時不要做任何特殊處理
    circle.on('click', function (e) {
        // 阻止事件傳播，避免點擊時打開或關閉工具提示
        L.DomEvent.stopPropagation(e);
    });

    // 可以加入半透明的脈動效果來突顯重要性
    setTimeout(() => {
        circle.setStyle({ fillOpacity: 0.2 });
        setTimeout(() => {
            circle.setStyle({ fillOpacity: 0.15 });
        }, 700);
    }, 200);

    return circle; // 返回繪製的圓形，方便後續操作
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
                <h3 class="tag">總結分析</h3>
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