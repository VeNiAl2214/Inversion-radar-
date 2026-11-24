import { getStore } from "@netlify/blobs";
import { auth, json } from "../lib/data.mjs";
export const config = { path: "/api/positions" };
export default async req => {
  if (!auth(req)) return json({ error: "Clave incorrecta" }, 401);
  const s = getStore("radar");
  const pos = (await s.get("pos", { type: "json" })) || [], log = (await s.get("log", { type: "json" })) || [];
  if (req.method === "GET") return json({ pos, log });
  const b = await req.json();
  if (req.method === "POST") pos.push({ id: crypto.randomUUID(), t: String(b.t), type: String(b.type), entry: +b.entry, amt: +b.amt, obj: +b.obj, stop: +b.stop, sell: +b.sell, at: Date.now(), notified: null });
  if (req.method === "PATCH") { const i = pos.findIndex(p => p.id === b.id); if (i >= 0) log.push({ ...pos.splice(i, 1)[0], res: +b.res, closed: Date.now() }); }
  await s.setJSON("pos", pos); await s.setJSON("log", log);
  return json({ pos, log });
};
