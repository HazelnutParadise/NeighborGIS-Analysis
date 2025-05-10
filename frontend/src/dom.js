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
    const onceHandler = function (e) {
        handler(e);
        off(el, event, onceHandler, options);
    };
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
