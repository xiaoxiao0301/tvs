(function () {
    if (!window.__SOLARA_IS_TV) {
        return;
    }

    const FOCUSABLE_SELECTOR = [
        '#searchInput',
        '#sourceSelectButton',
        '#searchBtn',
        '#playModeBtn',
        '.transport-button--prev',
        '#playPauseBtn',
        '.transport-button--next',
        '#mobileQueueToggle',
        '.playlist-item',
        '.search-result-item',
        '#qualityToggle',
        '#exportPlaylistBtn',
        '#importPlaylistBtn',
        '#clearPlaylistBtn',
        '.player-quality-option',
        '.quality-option',
        '#loadOnlineBtn'
    ].join(', ');

    let focusables = [];
    let focusedIndex = -1;

    function ensureTabIndex(el) {
        if (!el) return;
        if (!el.hasAttribute('tabindex')) {
            el.setAttribute('tabindex', '0');
        }
        el.classList.add('tv-focusable');
    }

    function collectFocusables() {
        const container = document.getElementById('mainContainer') || document;
        const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter((el) => !el.disabled && el.offsetParent !== null);
        nodes.forEach(ensureTabIndex);
        focusables = nodes;
        if (focusedIndex >= focusables.length) {
            focusedIndex = focusables.length - 1;
        }
    }

    function focusAt(index) {
        if (index < 0 || index >= focusables.length) return;
        if (focusedIndex >= 0) {
            focusables[focusedIndex].classList.remove('tv-focused');
        }
        focusedIndex = index;
        const target = focusables[focusedIndex];
        target.classList.add('tv-focused');
        try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
        if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function getGridPosition(el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function findNext(current, direction) {
        if (!current) return -1;
        const { x: cx, y: cy } = getGridPosition(current);
        let bestIndex = -1;
        let bestScore = Infinity;
        for (let i = 0; i < focusables.length; i++) {
            if (i === focusedIndex) continue;
            const el = focusables[i];
            const { x, y } = getGridPosition(el);
            const dx = x - cx;
            const dy = y - cy;
            // Directional filter
            if (direction === 'left' && dx >= -1) continue;
            if (direction === 'right' && dx <= 1) continue;
            if (direction === 'up' && dy >= -1) continue;
            if (direction === 'down' && dy <= 1) continue;
            // Penalize off-axis movement to keep navigation natural
            const primary = (direction === 'left' || direction === 'right') ? Math.abs(dx) : Math.abs(dy);
            const secondary = (direction === 'left' || direction === 'right') ? Math.abs(dy) : Math.abs(dx);
            const score = primary * 1 + secondary * 2.5;
            if (score < bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    function activate(el) {
        if (!el) return;
        // Prefer click
        if (typeof el.click === 'function') {
            el.click();
            return;
        }
        // Fallback to keyboard event
        const evt = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
        el.dispatchEvent(evt);
    }

    function handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (!['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', ' '].includes(key)) {
            return;
        }
        e.preventDefault();
        if (!focusables.length) collectFocusables();
        if (focusedIndex === -1 && focusables.length) {
            focusAt(0);
            return;
        }
        const current = focusables[focusedIndex];
        if (key === 'enter' || key === ' ') {
            activate(current);
            return;
        }
        const dir = key.replace('arrow', '');
        const next = findNext(current, dir);
        if (next !== -1) {
            focusAt(next);
        }
    }

    function init() {
        // Mark TV mode on body
        if (document.body) {
            document.body.classList.add('tv-view');
        }
        collectFocusables();
        if (focusables.length) {
            focusAt(0);
        }
        window.addEventListener('keydown', handleKeyDown, { passive: false });
        const list = document.getElementById('playlistItems');
        const results = document.getElementById('searchResults');
        const container = document.getElementById('mainContainer');
        
        const observer = new MutationObserver(() => {
            const prev = focusables[focusedIndex];
            collectFocusables();
            if (prev && focusables.includes(prev)) {
                focusedIndex = focusables.indexOf(prev);
                focusAt(focusedIndex);
            }
        });
        
        if (list) observer.observe(list, { childList: true, subtree: true });
        if (results) observer.observe(results, { childList: true, subtree: true });
        
        // Watch for search mode changes
        if (container) {
            const searchObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isSearchMode = container.classList.contains('search-mode');
                        if (isSearchMode) {
                            // When entering search mode, focus on first search result if available
                            setTimeout(() => {
                                collectFocusables();
                                const searchResults = focusables.filter(el => el.classList.contains('search-result-item'));
                                if (searchResults.length > 0) {
                                    const index = focusables.indexOf(searchResults[0]);
                                    focusAt(index);
                                }
                            }, 100);
                        }
                    }
                });
            });
            searchObserver.observe(container, { attributes: true, attributeFilter: ['class'] });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();


