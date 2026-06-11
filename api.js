/**
 * Currenx — API Module
 * Fetches exchange rates from CoinGecko (crypto) and ExchangeRate-API (fiat).
 */

const API = (() => {
    const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
    const EXCHANGERATE_BASE = 'https://open.er-api.com/v6/latest';

    const CRYPTO_IDS = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        SOL: 'solana',
        BNB: 'binancecoin',
        XRP: 'ripple',
        ADA: 'cardano',
        DOGE: 'dogecoin',
        DOT: 'polkadot',
        MATIC: 'matic-network',
        LTC: 'litecoin',
        AVAX: 'avalanche-2',
        LINK: 'chainlink',
        UNI: 'uniswap',
        ATOM: 'cosmos',
        TON: 'the-open-network',
    };

    const FIAT_SYMBOLS = ['USD', 'EUR', 'GBP', 'JPY', 'RUB', 'CNY', 'CHF', 'CAD', 'AUD', 'TRY'];

    let cachedFiatRates = null;
    let cachedCryptoData = null;
    let lastFiatFetch = 0;
    let lastCryptoFetch = 0;
    const CACHE_TTL = 60_000; // 1 minute

    async function fetchFiatRates(base = 'USD') {
        const now = Date.now();
        if (cachedFiatRates && (now - lastFiatFetch) < CACHE_TTL) {
            return cachedFiatRates;
        }
        try {
            const res = await fetch(`${EXCHANGERATE_BASE}/${base}`);
            if (!res.ok) throw new Error(`Fiat API error: ${res.status}`);
            const data = await res.json();
            cachedFiatRates = data.rates;
            lastFiatFetch = now;
            return cachedFiatRates;
        } catch (err) {
            console.error('Failed to fetch fiat rates:', err);
            return cachedFiatRates || {};
        }
    }

    async function fetchCryptoPrices() {
        const now = Date.now();
        if (cachedCryptoData && (now - lastCryptoFetch) < CACHE_TTL) {
            return cachedCryptoData;
        }
        try {
            const ids = Object.values(CRYPTO_IDS).join(',');
            const res = await fetch(
                `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
            );
            if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
            const data = await res.json();
            cachedCryptoData = data;
            lastCryptoFetch = now;
            return cachedCryptoData;
        } catch (err) {
            console.error('Failed to fetch crypto prices:', err);
            return cachedCryptoData || {};
        }
    }

    function getCryptoId(ticker) {
        return CRYPTO_IDS[ticker.toUpperCase()] || null;
    }

    function isCrypto(ticker) {
        return ticker.toUpperCase() in CRYPTO_IDS;
    }

    function isFiat(ticker) {
        return FIAT_SYMBOLS.includes(ticker.toUpperCase());
    }

    async function convert(amount, from, to) {
        from = from.toUpperCase();
        to = to.toUpperCase();

        const bothFiat = isFiat(from) && isFiat(to);
        const bothCrypto = isCrypto(from) && isCrypto(to);

        if (bothFiat) {
            const rates = await fetchFiatRates('USD');
            if (!rates[from] || !rates[to]) return null;
            const inUsd = amount / rates[from];
            return inUsd * rates[to];
        }

        const cryptoData = await fetchCryptoPrices();
        const fiatRates = await fetchFiatRates('USD');

        function toUsd(ticker, amt) {
            if (ticker === 'USD') return amt;
            if (isFiat(ticker)) {
                return fiatRates[ticker] ? amt / fiatRates[ticker] : null;
            }
            const id = getCryptoId(ticker);
            if (id && cryptoData[id]) {
                return amt * cryptoData[id].usd;
            }
            return null;
        }

        function fromUsd(ticker, usdAmt) {
            if (ticker === 'USD') return usdAmt;
            if (isFiat(ticker)) {
                return fiatRates[ticker] ? usdAmt * fiatRates[ticker] : null;
            }
            const id = getCryptoId(ticker);
            if (id && cryptoData[id] && cryptoData[id].usd) {
                return usdAmt / cryptoData[id].usd;
            }
            return null;
        }

        const usdValue = toUsd(from, amount);
        if (usdValue === null) return null;
        return fromUsd(to, usdValue);
    }

    function getAllTickers() {
        return [...FIAT_SYMBOLS, ...Object.keys(CRYPTO_IDS)];
    }

    return {
        fetchFiatRates,
        fetchCryptoPrices,
        getCryptoId,
        isCrypto,
        isFiat,
        convert,
        getAllTickers,
        CRYPTO_IDS,
        FIAT_SYMBOLS,
    };
})();
