import { getEl } from "../dom";
import { map } from './map.js';

let marker;
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
