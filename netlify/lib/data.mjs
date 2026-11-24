export const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
export const auth = req => !!process.env.APP_KEY && req.headers.get("x-app-key") === process.env.APP_KEY;

export async function yahoo(t, range = "1y") {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=${range}&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("No se encontró el ticker " + t);
  const j = (await r.json()).chart?.result?.[0];
  if (!j?.timestamp) throw new Error("Sin datos para " + t);
  const q = j.indicators.quote[0];
  const rows = j.timestamp.map((ts, i) => ({ ts, c: q.close[i], h: q.high[i], l: q.low[i] })).filter(x => x.c != null);
  return { c: rows.map(x => x.c), h: rows.map(x => x.h), l: rows.map(x => x.l), price: j.meta.regularMarketPrice ?? rows.at(-1).c, cur: j.meta.currency };
}

export async function finnhub(path) {
  if (!process.env.FINNHUB_KEY) return null;
  const r = await fetch(`https://finnhub.io/api/v1${path}${path.includes("?") ? "&" : "?"}token=${process.env.FINNHUB_KEY}`);
  return r.ok ? r.json() : null;
}
