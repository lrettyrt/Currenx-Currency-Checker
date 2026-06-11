/**
 * Currenx — App Module
 * UI logic: checkboxes, cards, search, converter, PWA registration.
 */

(() => {
    // Currency metadata
    const CURRENCIES = {
        USD: { name: 'Доллар США', symbol: '$', flag: '🇺🇸', type: 'fiat' },
        EUR: { name: 'Евро', symbol: '€', flag: '🇪🇺', type: 'fiat' },
        GBP: { name: 'Фунт стерлингов', symbol: '£', flag: '🇬🇧', type: 'fiat' },
        JPY: { name: 'Японская йена', symbol: '¥', flag: '🇯🇵', type: 'fiat' },
        RUB: { name: 'Российский рубль', symbol: '₽', flag: '🇷🇺', type: 'fiat' },
        CNY: { name: 'Китайский юань', symbol: '¥', flag: '🇨🇳', type: 'fiat' },
        CHF: { name: 'Швейцарский франк', symbol: 'Fr', flag: '🇨🇭', type: 'fiat' },
        CAD: { name: 'Канадский доллар', symbol: 'C$', flag: '🇨🇦', type: 'fiat' },
        AUD: { name: 'Австралийский доллар', symbol: 'A$', flag: '🇦🇺', type: 'fiat' },
        TRY: { name: 'Турецкая лира', symbol: '₺', flag: '🇹🇷', type: 'fiat' },
        BTC: { name: 'Bitcoin', symbol: '₿', flag: '🪙', type: 'crypto' },
        ETH: { name: 'Ethereum', symbol: 'Ξ', flag: '💎', type: 'crypto' },
        SOL: { name: 'Solana', symbol: 'SOL', flag: '☀️', type: 'crypto' },
        BNB: { name: 'BNB', symbol: 'BNB', flag: '🔶', type: 'crypto' },
        XRP: { name: 'Ripple', symbol: 'XRP', flag: '💧', type: 'crypto' },
        ADA: { name: 'Cardano', symbol: 'ADA', flag: '🔵', type: 'crypto' },
        DOGE: { name: 'Dogecoin', symbol: 'DOGE', flag: '🐕', type: 'crypto' },
        DOT: { name: 'Polkadot', symbol: 'DOT', flag: '⚪', type: 'crypto' },
        MATIC: { name: 'Polygon', symbol: 'MATIC', flag: '🟣', type: 'crypto' },
        LTC: { name: 'Litecoin', symbol: 'LTC', flag: '🥈', type: 'crypto' },
        AVAX: { name: 'Avalanche', symbol: 'AVAX', flag: '🔺', type: 'crypto' },
        LINK: { name: 'Chainlink', symbol: 'LINK', flag: '🔗', type: 'crypto' },
        UNI: { name: 'Uniswap', symbol: 'UNI', flag: '🦄', type: 'crypto' },
        ATOM: { name: 'Cosmos', symbol: 'ATOM', flag: '⚛️', type: 'crypto' },
        TON: { name: 'Toncoin', symbol: 'TON', flag: '💠', type: 'crypto' },
    };

    const DEFAULT_ENABLED = ['USD', 'EUR', 'BTC', 'ETH', 'SOL'];
    const STORAGE_KEY = 'currenx_enabled';

    // State
    let enabledCurrencies = loadEnabled();
    let ratesData = {};
    let refreshTimer = null;

    // DOM refs
    const cardsContainer = document.getElementById('cardsContainer');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.getElementById('closeModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const currencyToggles = document.getElementById('currencyToggles');
    const convertAmount = document.getElementById('convertAmount');
    const convertFrom = document.getElementById('convertFrom');
    const convertTo = document.getElementById('convertTo');
    const convertResult = document.getElementById('convertResult');
    const swapBtn = document.getElementById('swapBtn');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    // --- Persistence ---
    function loadEnabled() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [...DEFAULT_ENABLED];
        } catch {
            return [...DEFAULT_ENABLED];
        }
    }

    function saveEnabled() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledCurrencies));
    }

    // --- Toast ---
    function showToast(msg) {
        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 2500);
    }

    // --- Settings Modal ---
    function openSettings() {
        renderToggles();
        settingsModal.classList.remove('hidden');
    }

    function closeSettings() {
        settingsModal.classList.add('hidden');
    }

    function renderToggles(filter = '') {
        currencyToggles.innerHTML = '';
        const lowerFilter = filter.toLowerCase();

        // Group: Fiat, then Crypto
        const groups = [
            { label: '💵 Фиатные валюты', tickers: Object.keys(CURRENCIES).filter(t => CURRENCIES[t].type === 'fiat') },
            { label: '🪙 Криптовалюты', tickers: Object.keys(CURRENCIES).filter(t => CURRENCIES[t].type === 'crypto') },
        ];

        groups.forEach(group => {
            const filtered = group.tickers.filter(t => {
                if (!lowerFilter) return true;
                return t.toLowerCase().includes(lowerFilter) ||
                    CURRENCIES[t].name.toLowerCase().includes(lowerFilter);
            });
            if (filtered.length === 0) return;

            const heading = document.createElement('div');
            heading.className = 'text-xs text-slate-400 font-semibold uppercase tracking-wider mt-3 mb-1';
            heading.textContent = group.label;
            currencyToggles.appendChild(heading);

            filtered.forEach(ticker => {
                const cur = CURRENCIES[ticker];
                const isActive = enabledCurrencies.includes(ticker);

                const row = document.createElement('div');
                row.className = 'flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-700/50 transition-colors';

                row.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${cur.flag}</span>
                        <div>
                            <span class="font-medium text-sm">${ticker}</span>
                            <span class="text-slate-400 text-xs ml-1">${cur.name}</span>
                        </div>
                    </div>
                    <div class="toggle-switch ${isActive ? 'active' : ''}" data-ticker="${ticker}"></div>
                `;

                const toggle = row.querySelector('.toggle-switch');
                toggle.addEventListener('click', () => {
                    const t = toggle.dataset.ticker;
                    if (enabledCurrencies.includes(t)) {
                        enabledCurrencies = enabledCurrencies.filter(c => c !== t);
                        toggle.classList.remove('active');
                        showToast(`${t} убран`);
                    } else {
                        enabledCurrencies.push(t);
                        toggle.classList.add('active');
                        showToast(`${t} добавлен`);
                    }
                    saveEnabled();
                    renderCards();
                });

                currencyToggles.appendChild(row);
            });
        });
    }

    // --- Cards ---
    function renderCards() {
        // Remove old cards (keep emptyState)
        const cards = cardsContainer.querySelectorAll('.currency-card');
        cards.forEach(c => c.remove());

        if (enabledCurrencies.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        enabledCurrencies.forEach(ticker => {
            const cur = CURRENCIES[ticker];
            if (!cur) return;
            const card = createCard(ticker, cur);
            cardsContainer.appendChild(card);
        });
    }

    function createCard(ticker, cur) {
        const card = document.createElement('div');
        card.className = 'currency-card gradient-border p-4';
        card.dataset.ticker = ticker;

        const priceInfo = getPriceDisplay(ticker);

        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${cur.flag}</span>
                    <div>
                        <h3 class="font-bold text-base">${ticker}</h3>
                        <p class="text-xs text-slate-400">${cur.name}</p>
                    </div>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full ${cur.type === 'crypto' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'}">
                    ${cur.type === 'crypto' ? 'Крипто' : 'Фиат'}
                </span>
            </div>
            <div class="space-y-1">
                <div class="flex items-baseline justify-between">
                    <span class="text-2xl font-bold font-mono">${priceInfo.price}</span>
                    <span class="text-sm ${priceInfo.changeClass}">${priceInfo.change}</span>
                </div>
                <p class="text-xs text-slate-500">${priceInfo.subtitle}</p>
            </div>
        `;

        return card;
    }

    function getPriceDisplay(ticker) {
        const cur = CURRENCIES[ticker];
        let price = '—';
        let change = '';
        let changeClass = '';
        let subtitle = 'Загрузка...';

        if (cur.type === 'crypto') {
            const id = API.getCryptoId(ticker);
            if (id && ratesData.crypto && ratesData.crypto[id]) {
                const d = ratesData.crypto[id];
                price = formatPrice(d.usd, 'USD');
                const ch = d.usd_24h_change;
                if (ch != null) {
                    const sign = ch >= 0 ? '+' : '';
                    change = `${sign}${ch.toFixed(2)}%`;
                    changeClass = ch >= 0 ? 'price-up' : 'price-down';
                }
                subtitle = 'Цена в USD (24ч)';
            }
        } else {
            if (ratesData.fiat) {
                if (ticker === 'USD') {
                    price = '$1.00';
                    subtitle = 'Базовая валюта';
                } else if (ratesData.fiat[ticker]) {
                    price = `${formatPrice(ratesData.fiat[ticker], ticker)}`;
                    subtitle = `1 USD = ${ratesData.fiat[ticker].toFixed(4)} ${ticker}`;
                }
            }
        }

        return { price, change, changeClass, subtitle };
    }

    function formatPrice(value, currency) {
        if (value == null) return '—';
        if (value >= 1000) return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (value >= 1) return '$' + value.toFixed(2);
        return '$' + value.toFixed(6);
    }

    // --- Search ---
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        const cards = cardsContainer.querySelectorAll('.currency-card');
        cards.forEach(card => {
            const ticker = card.dataset.ticker.toLowerCase();
            const name = CURRENCIES[card.dataset.ticker]?.name.toLowerCase() || '';
            card.style.display = (!query || ticker.includes(query) || name.includes(query)) ? '' : 'none';
        });
    }

    // --- Converter ---
    function populateConverterSelects() {
        const tickers = Object.keys(CURRENCIES);
        [convertFrom, convertTo].forEach(select => {
            select.innerHTML = '';
            tickers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = `${CURRENCIES[t].flag} ${t} — ${CURRENCIES[t].name}`;
                select.appendChild(opt);
            });
        });
        convertFrom.value = 'USD';
        convertTo.value = 'BTC';
    }

    async function runConversion() {
        const amount = parseFloat(convertAmount.value);
        if (isNaN(amount) || amount < 0) {
            convertResult.textContent = 'Некорректная сумма';
            return;
        }
        convertResult.innerHTML = '<span class="pulse-loading text-slate-400">Считаю...</span>';
        const result = await API.convert(amount, convertFrom.value, convertTo.value);
        if (result === null) {
            convertResult.textContent = 'Ошибка конвертации';
        } else {
            const formatted = result >= 1 ? result.toLocaleString('en-US', { maximumFractionDigits: 4 }) : result.toFixed(8);
            convertResult.textContent = `${formatted} ${convertTo.value}`;
        }
    }

    // --- Data Loading ---
    async function loadRates() {
        const [fiat, crypto] = await Promise.all([
            API.fetchFiatRates('USD'),
            API.fetchCryptoPrices(),
        ]);
        ratesData.fiat = fiat;
        ratesData.crypto = crypto;
        renderCards();
    }

    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(loadRates, 60_000);
    }

    // --- PWA Registration ---
    function registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js', { scope: './' })
                .then(() => console.log('Service Worker registered'))
                .catch(err => console.log('SW registration failed:', err));
        }
    }

    // --- Events ---
    settingsBtn.addEventListener('click', openSettings);
    closeModal.addEventListener('click', closeSettings);
    modalOverlay.addEventListener('click', closeSettings);
    searchInput.addEventListener('input', handleSearch);
    convertAmount.addEventListener('input', runConversion);
    convertFrom.addEventListener('change', runConversion);
    convertTo.addEventListener('change', runConversion);
    swapBtn.addEventListener('click', () => {
        const tmp = convertFrom.value;
        convertFrom.value = convertTo.value;
        convertTo.value = tmp;
        runConversion();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSettings();
    });

    // --- Init ---
    function init() {
        registerSW();
        populateConverterSelects();
        renderCards();
        loadRates();
        startAutoRefresh();
    }

    init();
})();
