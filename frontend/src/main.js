import { getEl } from './dom.js';

// 設定logo圖片
import logoUrlFromFile from './assets/logo.svg';
getEl('#logo-img').src = logoUrlFromFile;

// 初始化各模組
import './chain1/chain1.js';
import './chain4/floor_plan.js';

import { fetchAddressPointInfo } from './chain1/chain1.js';
import ProgressBar from './progress_bar.js';
const userLoc = { lat: undefined, lng: undefined };
const USER_COORDINATES = getEl('#user-coordinates');
ProgressBar.show();
// 獲取用戶位置
function getUserLocation() {
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
}

function getUserLoc() {
    return userLoc;
}

function setUserLoc(lat, lng) {
    userLoc.lat = lat;
    userLoc.lng = lng;
}

getUserLocation();

import './left_right_btn.js';
import './switch_page.js';
import addStarOnRequiredInputs from './required_input.js';
import AddressPointRecords from './chain1/record_list.js';
addStarOnRequiredInputs();
AddressPointRecords().init();