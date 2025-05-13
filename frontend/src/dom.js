// selector
const cache = {};

export function getEl(selector) {
    if (!cache[selector]) {
        const el = document.querySelector(selector);
        if (!el) {
            console.warn(`DOM element not found: ${selector}`);
        }
        cache[selector] = el;
    }
    return cache[selector];
}

// domEvents
const eventRegistry = new Map();

/**
 * 綁定事件並記錄
 */
export function on(el, event, handler, options) {
    if (!el) return;
    el.addEventListener(event, handler, options);

    if (!eventRegistry.has(el)) {
        eventRegistry.set(el, []);
    }
    eventRegistry.get(el).push({ event, handler, options });
}

/**
 * 移除事件
 */
export function off(el, event, handler, options) {
    if (!el) return;
    el.removeEventListener(event, handler, options);

    const handlers = eventRegistry.get(el);
    if (!handlers) return;

    eventRegistry.set(
        el,
        handlers.filter(
            (h) =>
                !(h.event === event && h.handler === handler && h.options === options)
        )
    );
}

export function once(el, event, handler, options) {
    if (!el) return;

    // 創建一個包裝函數，並保留對它的引用
    const onceHandler = function (e) {
        // 先移除事件監聽，避免在處理過程中可能再次觸發
        off(el, event, onceHandler, options);
        // 執行原始處理器
        handler(e);
    };

    // 將包裝函數和原始處理器關聯起來，方便後續識別
    onceHandler._originalHandler = handler;

    // 註冊事件
    on(el, event, onceHandler, options);
}

/**
 * ✅ 移除指定元素上所有事件
 */
export function offAllEventsOf(el) {
    const handlers = eventRegistry.get(el);
    if (!handlers) return;

    for (const { event, handler, options } of handlers) {
        el.removeEventListener(event, handler, options);
    }

    eventRegistry.delete(el);
}

/**
 * 🔁 全部移除（整個頁面）
 */
export function offAll() {
    for (const [el, handlers] of eventRegistry.entries()) {
        for (const { event, handler, options } of handlers) {
            el.removeEventListener(event, handler, options);
        }
    }
    eventRegistry.clear();
}
