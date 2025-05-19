const NoPOIHTML = `
<div class="empty-poi-notice">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>附近找不到 POI 資訊</span>
    <small>可能是當前區域無資料或搜尋範圍內無相關設施</small>
</div>
`;

export default NoPOIHTML;