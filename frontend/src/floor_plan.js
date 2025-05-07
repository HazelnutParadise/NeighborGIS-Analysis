
const generateFloorInit = (progress_bar) => {
    const FLOOR_GENERATE_BTN = document.getElementById('floorGenerateBtn');
    const FLOOR_PLAN = document.getElementById('floorPlan');
    FLOOR_GENERATE_BTN.addEventListener('click', async () => {
        FLOOR_GENERATE_BTN.innerText = '生成中...';
        FLOOR_GENERATE_BTN.disabled = true;
        FLOOR_PLAN.innerHTML = SPINNER_HTML;
        progress_bar.show();
        const reqData = {
            building_area_m2: document.getElementById('building_area_m2').value,
            total_units: document.getElementById('total_units').value,
            public_ratio: document.getElementById('public_ratio').value,
            balcony_depth: document.getElementById('balcony_depth').value,
            arrangement_type: document.getElementById('arrangement_type').value,
            unit_spacing: document.getElementById('unit_spacing').value,
            // m2_to_ping: document.getElementById('m2_to_ping').value ? document.getElementById('m2_to_ping').value : null,
        }
        try {
            // 檢查required欄位是否填寫
            for (const key in reqData) {
                const el = document.getElementById(key)
                // 如果標為required
                if (el.hasAttribute('required') && reqData[key] === '') {
                    // 如果欄位為空，則顯示提示訊息
                    throw new Error(`${document.querySelector(`label[for="${el.id}"]`).innerText.slice(0, -2)} 欄位必填`);
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
            progress_bar.hide();
        }
    });
}

export default generateFloorInit;