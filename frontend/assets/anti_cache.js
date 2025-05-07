const AntiCacheImport = () => {
    const now = new Date().getTime().toString();
    return {
        CSS: (url) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = url + '?v=' + now;
            document.head.appendChild(link);
        },
        JS: (url) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url + '?v=' + now;
            document.head.appendChild(script);
        },
    };
}
