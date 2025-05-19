import { map } from './map';
import { on, getEl } from "../dom";
import NoPOIHTML from '../components/no_poi';

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
    }    // 根據 POI 類型決定顏色
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

export const showPoiList = (data) => {
    const poiListDiv = getEl('#poi-list');

    // 如果沒有 POI 數據，顯示提示訊息
    if (!data || !data.features || data.features.length === 0) {
        poiListDiv.innerHTML = NoPOIHTML;
        return;
    }

    // 將 POI 資料按類型分組
    const poiByType = {};
    data.features.forEach(feature => {
        const poiType = feature.properties.poi_type;
        if (!poiByType[poiType]) {
            poiByType[poiType] = [];
        }
        poiByType[poiType].push(feature);
    });

    // 顯示 POI 分類和數量摘要
    let poiHtml = '<div class="poi-summary">';    // 定義類型對應的文字和樣式類
    const typeInfo = {
        'food': { text: '餐飲', class: 'food-type', icon: 'utensils', emoji: '🍽️' },
        'health': { text: '醫療', class: 'health-type', icon: 'heartbeat', emoji: '🏥' },
        'public': { text: '公共設施', class: 'public-type', icon: 'building', emoji: '🏢' }
    };

    // 添加 POI 類型摘要信息
    Object.keys(poiByType).forEach(poiType => {
        const info = typeInfo[poiType] || { text: poiType, class: 'other-type', icon: 'map-marker' };
        const count = poiByType[poiType] && Array.isArray(poiByType[poiType]) ? poiByType[poiType].length : 0; // Check if poiByType[poiType] is an array
        poiHtml += `
            <div class="poi-type-summary ${info.class}">
                <div class="poi-type-icon">
                    ${info.emoji}
                </div>
                <div class="poi-type-info">
                    <span class="poi-type-name">${info.text}</span>
                    <span class="poi-type-count">${count} 個</span>
                </div>
            </div>
        `;
    });

    poiHtml += '</div>';

    // 添加 POI 詳細列表
    poiHtml += '<div class="poi-list-container">';

    // 依次顯示每種類型的 POI
    Object.keys(poiByType).forEach(poiType => {
        const info = typeInfo[poiType] || { text: poiType, class: 'other-type' };
        const poiCount = poiByType[poiType] && Array.isArray(poiByType[poiType]) ? poiByType[poiType].length : 0; // Check if poiByType[poiType] is an array
        poiHtml += `
            <div class="poi-category">
                <div class="poi-category-header ${info.class}-header" data-toggle="collapse">
                    <h4>${info.emoji} ${info.text}</h4>
                    <div class="poi-header-right">
                        <span class="poi-count">${poiCount}個</span>
                        <span class="poi-toggle-icon">▾</span>
                    </div>
                </div>
                <div class="poi-items">
        `;// 添加該類型的 POI 項目，按距離排序
        if (poiByType[poiType] && Array.isArray(poiByType[poiType])) { // Check if poiByType[poiType] is an array
            poiByType[poiType]
                .sort((a, b) => (a.properties.distance_meters || 0) - (b.properties.distance_meters || 0))
                .forEach(feature => {
                    const { name = '未命名', distance = '距離不詳', 'addr:full': address = '無地址' } = feature.properties;
                    const coordinates = feature.geometry.coordinates; // [longitude, latitude]
                    const googleMapsUrl = `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`;

                    // 轉換距離字符串為數字和單位
                    let distanceDisplay = distance;
                    if (typeof distance === 'string' && distance.includes('公尺')) {
                        const distanceNumber = parseFloat(distance);
                        if (!isNaN(distanceNumber)) {
                            // 若距離小於 100 公尺，顯示「附近」
                            if (distanceNumber < 100) {
                                distanceDisplay = `附近`;
                            } else {
                                distanceDisplay = `${Math.round(distanceNumber)}m`;
                            }
                        }
                    } else if (typeof distance === 'number') {
                        // 直接處理數字類型的距離
                        if (distance < 100) {
                            distanceDisplay = `附近`;
                        } else {
                            distanceDisplay = `${Math.round(distance)}m`;
                        }
                    }                // 截取地址，如果太長則顯示省略號
                    const shortAddress = typeof address === 'string' ? (address.length > 25 ? address.substring(0, 25) + '...' : address) : "無地址資訊";

                    poiHtml += `
                        <div class="poi-item">
                            <div class="poi-item-header">
                                <span class="poi-name">${name}</span>
                                <a href="${googleMapsUrl}" target="_blank" class="poi-google-maps-btn" title="在 Google 地圖上查看">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                </a>
                                <span class="poi-distance">${distanceDisplay}</span>
                            </div>
                            <div class="poi-address" title="${address}">${shortAddress}</div>
                        </div>
                    `;
                });
        }

        poiHtml += `
                </div>
            </div>
        `;
    }); poiHtml += '</div>';    // 更新 DOM
    poiListDiv.innerHTML = poiHtml;

    // 添加使用指南提示 (僅在有 POI 數據時顯示)
    if (data.features && data.features.length > 0) {
        // const poiGuide = document.createElement('div');
        // poiGuide.className = 'poi-guide';
        // poiGuide.innerHTML = `

        // `;
        // poiListDiv.prepend(poiGuide);

        // 3秒後淡出指南提示
        // setTimeout(() => {
        //     poiGuide.classList.add('fade-out');
        //     setTimeout(() => {
        //         poiGuide.remove();
        //     }, 500);
        // }, 5000);

        // 添加類別標題的收起/展開功能
        const categoryHeaders = document.querySelectorAll('.poi-category-header[data-toggle="collapse"]');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', function () {
                const poiItems = this.nextElementSibling;
                const toggleIcon = this.querySelector('.poi-toggle-icon');

                // 切換顯示/隱藏
                if (poiItems.style.display === 'none') {
                    poiItems.style.display = 'block';
                    toggleIcon.textContent = '▾';
                    toggleIcon.style.transform = 'rotate(0deg)';
                } else {
                    poiItems.style.display = 'none';
                    toggleIcon.textContent = '▸';
                    toggleIcon.style.transform = 'rotate(-90deg)';
                }
            });
        });
    }

    // 添加點擊事件，點擊 POI 項目時在地圖上高亮顯示
    document.querySelectorAll('.poi-item').forEach((item, index) => {
        const poiData = JSON.stringify(data.features[index].geometry.coordinates);
        item.setAttribute('data-coordinates', poiData);

        on(item, 'click', function () {
            // 獲取所有 POI 項目
            const poiItems = document.querySelectorAll('.poi-item');

            // 重置所有 POI 項目的選中狀態
            poiItems.forEach(i => i.classList.remove('active'));            // 標記當前 POI 項目為活動狀態
            item.classList.add('active');

            // 獲取坐標並設置地圖視圖
            const coordinates = JSON.parse(this.getAttribute('data-coordinates'));
            const latlng = L.latLng(coordinates[1], coordinates[0]); // GeoJSON 是 [經度, 緯度]，Leaflet 是 [緯度, 經度]

            // 在地圖上高亮顯示 POI
            poiLayer.eachLayer(layer => {
                // 重置所有圖層的樣式
                layer.setStyle({
                    radius: 3.5,
                    weight: 0.5,
                    fillOpacity: 0.8
                });

                const layerCoords = layer.getLatLng();
                if (layerCoords.lat === latlng.lat && layerCoords.lng === latlng.lng) {
                    // 高亮選中的 POI
                    layer.setStyle({
                        radius: 7,
                        weight: 2,
                        fillOpacity: 1,
                        color: '#0066cc'
                    });
                    layer.openPopup();
                    map.setView(layerCoords, 17);
                }
            });
        });
    });
}

export const showPoiAnalysisResult = (resData) => {
    const nearbyAnalysisResultDiv = getEl('#nearby-analysis-result');

    // 如果沒有分析數據，顯示提示訊息
    if (!resData || !resData.analysis || resData.analysis.length === 0) {
        nearbyAnalysisResultDiv.innerHTML = NoPOIHTML;
        return;
    }

    // 更新 UI 以顯示分析結果
    let analysisHtml = '<div class="analysis-container">';

    // 處理各個 POI 類型的分析
    if (resData.analysis && resData.analysis.length > 0) {
        resData.analysis.forEach(poiAnalysis => {
            const advantagesList = poiAnalysis.advantages && Array.isArray(poiAnalysis.advantages) ? poiAnalysis.advantages.map(adv => `<li>${adv}</li>`).join('') : '';
            const disadvantagesList = poiAnalysis.disadvantages && Array.isArray(poiAnalysis.disadvantages) ? poiAnalysis.disadvantages.map(dis => `<li>${dis}</li>`).join('') : '';
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
                                        ${advantagesList}
                                    </ul>
                                </div>
                            </div>
                            <div class="analysis-column disadvantages-column">
                                <div class="column-header disadvantages-header">
                                    <h4>劣 勢</h4>
                                </div>
                                <div class="column-content">
                                    <ul class="disadvantages-list">
                                        ${disadvantagesList}
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