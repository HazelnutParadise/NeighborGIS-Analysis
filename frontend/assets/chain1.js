
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
    const poi_data = await fetchAddressPointNearbyPOI(lat, lng, original_btn_text);
    AddressPointRecords().add({
        address: data.address,
        lat: lat,
        lng: lng,
        zoning: zoning.zone ? zoning.zone : '無資料',
        far: zoning.far ? `${zoning.far}` : '無資料',
        bcr: zoning.bcr ? `${zoning.bcr}` : '無資料',
        is_public_land: zoning.is_public_land && zoning.zone ? (zoning.is_public_land === "Y" ? '是' : '否') : '無資料',
        nearby_poi: poi_data,
    });
}

async function fetchAddressPointNearbyPOI(lat, lng, original_btn_text) {
    const url = `/api/nearby-poi/${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    try {
        const res = await fetch(url);
        const resJson = await res.json();
        if (!res.ok) {
            // todo: 要改放在新容器
            RESULT_DIV.innerHTML = `查詢失敗，伺服器 ${res.status}`;
            throw new Error(`查詢失敗，伺服器 ${res.status}` + resJson ? `\n${resJson.message}` : '');
        }
        const data = resJson.data;
        console.table(data)
        if (data.length === 0) {
            // todo: 要改放在新容器
            RESULT_DIV.innerHTML += `<br>查無周邊POI`;
            SEARCH_BTN.innerText = original_btn_text;
            SEARCH_BTN.disabled = false;
            progress_bar.hide();
            return;
        }
        // 根據 POI 類型決定顏色
        const colorMap = {
            food: 'lightblue',
            health: 'lightgreen',
            public: 'orange',
        };

        // 加入 GeoJSON Layer
        L.geoJSON(data, {
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



        // todo: 要改放在新容器
        // let poiList = '<br>周邊POI：<br>';
        // data.forEach((poi) => {
        //     poiList += `${poi.name} (${poi.distance} 公尺)<br>`;
        // });
        // RESULT_DIV.innerHTML += poiList;
        return data;
    } catch (error) {
        // RESULT_DIV.innerHTML += `<br>查詢周邊POI失敗，錯誤訊息： ${error.message}`;
    } finally {
        SEARCH_BTN.innerText = original_btn_text;
        SEARCH_BTN.disabled = false;
        progress_bar.hide();
    }
}

// todo: 根據點擊的紀錄動態抽換地圖上的點和poi