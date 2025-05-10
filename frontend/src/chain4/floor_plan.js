import ProgressBar from "../progress_bar";
import SpinnerHTML from "../components/spinner";
import { on, getEl } from "../dom";

const FLOOR_GENERATE_BTN = getEl('#floorGenerateBtn');
on(FLOOR_GENERATE_BTN, 'click', async () => {
    const FLOOR_PLAN = getEl('#floorPlan');
    FLOOR_GENERATE_BTN.innerText = '生成中...';
    FLOOR_GENERATE_BTN.disabled = true;
    FLOOR_PLAN.innerHTML = SpinnerHTML;
    ProgressBar.show();
    const reqData = {
        building_area_m2: getEl('#building_area_m2').value,
        total_units: getEl('#total_units').value,
        public_ratio: getEl('#public_ratio').value,
        balcony_depth: getEl('#balcony_depth').value,
        arrangement_type: getEl('#arrangement_type').value,
        unit_spacing: getEl('#unit_spacing').value,
        // m2_to_ping: document.getElementById('m2_to_ping').value ? document.getElementById('m2_to_ping').value : null,
    }
    try {
        // 檢查required欄位是否填寫
        for (const key in reqData) {
            const el = getEl(`#${key}`)
            // 如果標為required
            if (el.hasAttribute('required') && reqData[key] === '') {
                // 如果欄位為空，則顯示提示訊息
                throw new Error(`${getEl(`label[for="${el.id}"]`).innerText.slice(0, -2)} 欄位必填`);
            }
        }

        const res = await fetch(`/api/generate-floor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqData)
        });
        let resJson = '';
        try {
            resJson = await res.json();
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }


        if (!res.ok) {
            const message = `查詢失敗，伺服器 ${res.status}` + (resJson ? `\n${resJson.message}` : '');
            FLOOR_PLAN.innerText = message;
            throw new Error(message);
        }
        const data = resJson.data;
        FLOOR_PLAN.innerHTML = data;
    } catch (error) {
        FLOOR_PLAN.innerText = error.message;
        alert(error.message);
        console.error('Error:', error);
    } finally {
        FLOOR_GENERATE_BTN.innerText = '生成';
        FLOOR_GENERATE_BTN.disabled = false;
        // 隱藏進度條
        ProgressBar.hide();
    }
});