/**
 * 防止瀏覽器快取資源的工具 - 優化版
 * 下載完畢後再替換，防止畫面抖動
 */

// 獲取當前時間戳
const CACHE_BUSTER = new Date().getTime();

// 為資源 URL 添加時間戳
function addCacheBuster(url, isLocal = true) {
    // 如果不是本地資源且不強制處理，則跳過
    if (url.indexOf('http') === 0 && !url.includes(window.location.host) && !isLocal) {
        return url;
    }

    // 移除現有時間戳參數
    url = url.replace(/[?&](t|v)=\d+/g, '');

    // 添加新的時間戳
    const separator = url.indexOf('?') !== -1 ? '&' : '?';
    return `${url}${separator}t=${CACHE_BUSTER}`;
}

// 動態加載 JavaScript 檔案時防止快取
function loadScriptWithCacheBuster(scriptSrc, callback) {
    const script = document.createElement('script');
    script.src = addCacheBuster(scriptSrc);

    if (callback && typeof callback === 'function') {
        script.onload = callback;
    }

    document.head.appendChild(script);
    return script;
}

// 動態加載 CSS 檔案時防止快取
function loadStyleWithCacheBuster(styleSrc, callback) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = addCacheBuster(styleSrc);

    if (callback && typeof callback === 'function') {
        link.onload = callback;
    }

    document.head.appendChild(link);
    return link;
}

// 在頁面重新整理或從其他頁面返回時強制重新載入
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        // 頁面從快取中恢復時強制重新載入
        window.location.reload();
    }
});

// 防止在使用瀏覽器返回按鈕時從快取載入頁面
window.onpageshow = function (event) {
    if (event.persisted) {
        window.location.reload();
    }
};

// 平滑替換 CSS，防止畫面抖動
function smoothlyReplaceCss(originalLink, newHref) {
    // 創建新的 link 元素但不立即添加到 DOM
    const newLink = document.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.href = newHref;

    // 複製原始 link 的其他屬性
    Array.from(originalLink.attributes).forEach(attr => {
        if (attr.name !== 'href' && attr.name !== 'rel') {
            newLink.setAttribute(attr.name, attr.value);
        }
    });

    // 當新樣式表加載完成時，替換舊樣式表
    newLink.onload = function () {
        // 確保新樣式表已生效後再刪除舊的
        setTimeout(() => {
            // 如果原始元素仍存在於 DOM 中，則進行替換
            if (originalLink.parentNode) {
                originalLink.parentNode.removeChild(originalLink);
            }
        }, 50); // 輕微延遲以確保無縫切換
    };

    // 添加新樣式表到 head
    document.head.appendChild(newLink);
}

// 平滑替換 JS，確保下載完成再執行
function smoothlyReplaceScript(originalScript, newSrc) {
    // 創建新腳本元素
    const newScript = document.createElement('script');
    newScript.src = newSrc;

    // 複製原腳本的其他屬性
    Array.from(originalScript.attributes).forEach(attr => {
        if (attr.name !== 'src') {
            newScript.setAttribute(attr.name, attr.value);
        }
    });

    // 標記腳本為處理過的，避免重複處理
    originalScript.setAttribute('data-cache-busted', 'true');

    // 當新腳本載入完成後，移除舊腳本
    newScript.onload = function () {
        if (originalScript.parentNode) {
            originalScript.parentNode.removeChild(originalScript);
        }
    };

    // 在原腳本之後插入新腳本
    if (originalScript.parentNode) {
        originalScript.parentNode.insertBefore(newScript, originalScript.nextSibling);
    }
}

// 自動處理頁面上的所有資源
function preventAllCaching() {
    // 防止 CSS 快取，平滑替換
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href && !link.hasAttribute('data-cache-busted')) {
            const newHref = addCacheBuster(link.href, false);
            smoothlyReplaceCss(link, newHref);
        }
    });

    // 防止 JavaScript 快取，平滑替換
    document.querySelectorAll('script[src]').forEach(script => {
        if (script.src &&
            !script.hasAttribute('data-cache-busted') &&
            !script.src.includes('anti_cache.js')) {
            const newSrc = addCacheBuster(script.src, false);
            smoothlyReplaceScript(script, newSrc);
        }
    });
}

// 在 DOM 內容載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
    preventAllCaching()
});