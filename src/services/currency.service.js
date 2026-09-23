import { AppError } from "../utils/app-error.js";

const ratesCache = { data: null, fetchedAt: 0 };
const coinsCache = { data: null, fetchedAt: 0 };
const priceCache = new Map();

const ratesTtlMs = 5 * 60 * 1000;
const coinsTtlMs = 24 * 60 * 60 * 1000;
const priceTtlMs = 5 * 60 * 1000;
const requestTimeoutMs = 10_000;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Currency provider returned ${response.status}.`);
  }

  return response.json();
}

async function getExchangeRates() {
  const now = Date.now();
  if (ratesCache.data && now - ratesCache.fetchedAt < ratesTtlMs) {
    return ratesCache.data;
  }

  const result = await fetchJson("https://api.coingecko.com/api/v3/exchange_rates");
  if (!result?.rates) throw new Error("The currency provider returned invalid rates.");
  ratesCache.data = result.rates;
  ratesCache.fetchedAt = now;
  return ratesCache.data;
}

async function getCoinSymbols() {
  const now = Date.now();
  if (coinsCache.data && now - coinsCache.fetchedAt < coinsTtlMs) {
    return coinsCache.data;
  }

  const coins = await fetchJson("https://api.coingecko.com/api/v3/coins/list");
  if (!Array.isArray(coins)) throw new Error("The currency provider returned an invalid coin list.");

  const grouped = new Map();
  for (const coin of coins) {
    if (!coin.id || !coin.symbol) continue;
    const symbol = coin.symbol.toUpperCase();
    const current = grouped.get(symbol);
    if (!current || coin.id.length < current.id.length) grouped.set(symbol, coin);
  }

  coinsCache.data = grouped;
  coinsCache.fetchedAt = now;
  return coinsCache.data;
}

async function getCoinUsdPrice(coinId) {
  const now = Date.now();
  const cached = priceCache.get(coinId);
  if (cached && now - cached.fetchedAt < priceTtlMs) return cached.usd;

  const result = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`,
  );
  const usd = result?.[coinId]?.usd;
  if (!Number.isFinite(usd) || usd <= 0) throw new Error(`No USD price is available for ${coinId}.`);
  priceCache.set(coinId, { fetchedAt: now, usd });
  return usd;
}

async function resolveUsdPrice(currency, rates, coins) {
  if (currency === "USD") return { name: "US Dollar", price: 1, type: "fiat" };

  const rate = rates[currency.toLowerCase()];
  if (rate?.value) {
    return {
      name: rate.name ?? currency,
      price: rates.usd.value / rate.value,
      type: rate.type ?? "crypto",
    };
  }

  const coin = coins.get(currency);
  if (!coin) {
    throw new AppError(`${currency} is not supported by the currency provider.`, {
      code: "UNSUPPORTED_CURRENCY",
      statusCode: 422,
    });
  }

  return {
    name: coin.name,
    price: await getCoinUsdPrice(coin.id),
    type: "crypto",
  };
}

export async function convertCurrency(from, to, amount) {
  const fromCode = from.trim().toUpperCase();
  const toCode = to.trim().toUpperCase();
  const quoteExpiresAt = new Date(Date.now() + ratesTtlMs).toISOString();

  if (fromCode === toCode) {
    return {
      amount,
      convertedAmount: amount,
      from: { code: fromCode, name: fromCode, type: "identity" },
      lastUpdated: new Date().toISOString(),
      quoteExpiresAt,
      rate: 1,
      source: "identity",
      to: { code: toCode, name: toCode, type: "identity" },
    };
  }

  try {
    const [rates, coins] = await Promise.all([getExchangeRates(), getCoinSymbols()]);
    const [fromMeta, toMeta] = await Promise.all([
      resolveUsdPrice(fromCode, rates, coins),
      resolveUsdPrice(toCode, rates, coins),
    ]);
    const rate = fromMeta.price / toMeta.price;
    const convertedAmount = amount * rate;

    return {
      amount,
      convertedAmount: Number(convertedAmount.toFixed(8)),
      from: { code: fromCode, name: fromMeta.name, type: fromMeta.type },
      lastUpdated: new Date().toISOString(),
      quoteExpiresAt,
      rate: Number(rate.toFixed(12)),
      source: "coingecko",
      to: { code: toCode, name: toMeta.name, type: toMeta.type },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Live currency conversion is temporarily unavailable.", {
      code: "CURRENCY_PROVIDER_UNAVAILABLE",
      statusCode: 503,
    });
  }
}
