import AddressPointRecords from './record_list.js';
import ProgressBar from '../progress_bar.js';
import SpinnerHTML from '../components/spinner.js';
import { getEl, on } from '../dom.js';
import { showAddressPointResult, drawDistanceCircle, addPoiLayer, showPoiAnalysisResult } from './show_result.js';

const SEARCH_BTN = document.getElementById('searchBtn');
const RESULT_DIV = document.getElementById('result');

// 自動使用目前位置執行
const userLoc = { lat: undefined, lng: undefined };
const USER_COORDINATES = getEl('#user-coordinates');
(function getUserLocation() {
    ProgressBar.show()
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                USER_COORDINATES.innerHTML = `目前座標: ${lat}, ${lng}`;
                userLoc.lat = lat;
                userLoc.lng = lng;
                ProgressBar.hide()
                await fetchAddressPointInfo(userLoc);
            },
            (error) => {
                console.error("無法取得位置", error);
                USER_COORDINATES.innerHTML = "無法取得位置";
                ProgressBar.hide()
            }
        );
    } else {
        USER_COORDINATES.innerHTML = "瀏覽器不支援定位服務";
        ProgressBar.hide()
    }
})();

on(SEARCH_BTN, 'click', async () => {
    // 顯示進度條
    await fetchAddressPointInfo();
});

async function fetchAddressPointInfo(userCoordinates) {
    const original_btn_text = SEARCH_BTN.innerText;
    const original_result_text = RESULT_DIV.innerText;
    SEARCH_BTN.disabled = true;
    SEARCH_BTN.innerText = '查詢中...';
    RESULT_DIV.innerHTML = SpinnerHTML;
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
    ProgressBar.show();
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
        ProgressBar.hide();
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
            ProgressBar.hide();
            return;
        }
        drawDistanceCircle(lat, lng);
        addPoiLayer(data);
        return data;
    } catch (error) {
        alert(error.message);
    }
}

async function fetchNearbyAnalysis(data, original_btn_text) {
    const nearbyAnalysisResultDiv = document.getElementById('nearby-analysis-result');
    try {
        nearbyAnalysisResultDiv.innerHTML = SpinnerHTML;
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
        ProgressBar.hide();
    }
}