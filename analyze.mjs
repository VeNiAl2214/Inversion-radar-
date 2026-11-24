import { yahoo, finnhub, auth, json } from "../lib/data.mjs";
import { sma, rsi, atr, techScore } from "../lib/ta.mjs";
export const config = { path: "/api/analyze" };
const cache = new Map();
const r2 = x => Math.round(x * 100) / 100;
const clamp = (x, a, b) => Math.max(a, Math.min(b, Math.round(+x) || a));

async function claude(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.MODEL || "claude-sonnet-5-5", max_tokens: 900, messages: [{ role: "user", content: prompt }] })
  });
  const j = await r.json();
  const txt = (j.content || []).map(x => x.text || "").join("");
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("La IA no devolvió un análisis válido");
  return JSON.parse(m[0]);
}

export default async req => {
  if (!auth(req)) return json({ error: "Clave incorrecta" }, 401);
  const u = new URL(req.url);
  const t = (u.searchParams.get("t") || "").toUpperCase().replace(/[^A-Z0-9.^=-]/g, "");
  const type = ["Acción", "CEDEAR", "Bono"].includes(u.searchParams.get("type")) ? u.searchParams.get("type") : "Acción";
  if (!t) return json({ error: "Falta el ticker" }, 400);
  const key = t + type, hit = cache.get(key);
  if (hit && Date.now() - hit.at < 600000) return json(hit.d);
  try {
    const { c, h, l, price, cur } = await yahoo(t);
    const bono = type === "Bono", today = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const [metric, news] = await Promise.all([
      bono ? null : finnhub(`/stock/metric?symbol=${t}&metric=all`),
      bono ? finnhub("/news?category=general") : finnhub(`/company-news?symbol=${t}&from=${from}&to=${today}`)
    ]);
    const m = metric?.metric || {};
    const fund = bono ? "Es un bono o ETF de bonos: evaluá el contexto macro (tasas, inflación, Fed)." : JSON.stringify({ pe: m.peBasicExclExtraTTM, crecimientoIngresos: m.revenueGrowthTTMYoy, margenNeto: m.netProfitMarginTTM, deudaPatrimonio: m["totalDebt/totalEquityQuarterly"], roe: m.roeTTM });
    const heads = (news || []).slice(0, 8).map(n => "- " + n.headline).join("\n") || "(sin noticias)";
    const tech = { precio: r2(price), sma50: r2(sma(c, 50) || 0), sma200: r2(sma(c, 200) || 0), rsi14: r2(rsi(c) || 0) };
    const a = await claude(`Hoy es ${today}. Sos un analista de mercados. Analizá ${t} (${type}).
Técnico: ${JSON.stringify(tech)}
Fundamentales: ${fund}
Titulares recientes:
${heads}

Respondé SOLO con un JSON válido, sin texto extra, en español:
{"fundamental":0-100,"news":0-100,"hold_days":[min,max],"summary":"1 frase","reasons":["3 razones breves"],"risks":["2 riesgos breves"]}
fundamental = calidad del negocio o del contexto macro; news = impacto de los titulares (50 es neutro); hold_days = plazo sugerido en días (entre 5 y 365).`);
    const ts = techScore(c), fs = clamp(a.fundamental, 0, 100), ns = clamp(a.news, 0, 100);
    const score = Math.round(.4 * ts + .35 * fs + .25 * ns);
    const stop = Math.min(12, Math.max(2, Math.round(1.5 * atr(h, l, c) / price * 1000) / 10));
    const d0 = clamp(a.hold_days?.[0], 5, 365);
    const d = {
      t, type, price: r2(price), cur, score, veredicto: score >= 70 ? "Comprar" : score >= 50 ? "Mantener" : "Evitar",
      tech: ts, fund: fs, news: ns, days: [d0, Math.max(d0, clamp(a.hold_days?.[1], 5, 365))],
      stop, obj: Math.round(stop * 18) / 10, rsi: r2(rsi(c) || 0), sma50: tech.sma50, sma200: tech.sma200,
      summary: a.summary || "", reasons: (a.reasons || []).slice(0, 3), risks: (a.risks || []).slice(0, 2),
      series: c.slice(-120).map(r2), at: Date.now()
    };
    cache.set(key, { at: Date.now(), d });
    return json(d);
  } catch (e) { return json({ error: e.message }, 500); }
};
