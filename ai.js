// Netlify Function: a small, locked-down proxy to the Anthropic API.
// Your API key lives ONLY in the ANTHROPIC_API_KEY environment variable on Netlify.
const hits = new Map(); // best-effort per-IP rate limit (resets when the function cold-starts)
const LIMIT = 20, WINDOW_MS = 10 * 60 * 1000;
const SYSTEM = 'You are the writing engine for Pitchlore, a men\u2019s cricket game app. Only produce cricket-related content for the task you are given. If the request is not about cricket, reply with the single word UNRELATED.';
const json = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });

function originOk(h) {
  const origin = h.origin || h.referer;
  if (!origin) return true; // same-origin fetches from some browsers omit Origin on GET only; POST normally sends it
  try {
    const host = new URL(origin).host;
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    return host === h.host || allowed.includes(host);
  } catch (e) { return false; }
}
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > LIMIT;
}
function parseJson(text) {
  const clean = String(text).replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch (e) {}
  const a = clean.indexOf('{'), b = clean.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1));
  throw new Error('bad_json');
}
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, { error: 'Server is missing ANTHROPIC_API_KEY' });
  const h = event.headers || {};
  if (!originOk(h)) return json(403, { error: 'Origin not allowed' });
  const ip = h['x-nf-client-connection-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json(429, { error: 'Too many requests. Try again in a few minutes.' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad JSON' }); }
  const prompt = String(body.prompt || '').slice(0, 6000);
  if (!prompt) return json(400, { error: 'Missing prompt' });
  const wantJson = !!body.json;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 600,
        system: SYSTEM + (wantJson ? ' Return ONLY valid JSON with no markdown fences and no commentary.' : ''),
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (r.status === 429) return json(429, { error: 'AI is busy. Try again shortly.' });
    if (!r.ok) return json(502, { error: 'AI request failed (' + r.status + ')' });
    const data = await r.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    if (wantJson) return json(200, { value: parseJson(text) });
    return json(200, { text });
  } catch (e) {
    return json(502, { error: 'AI request failed' });
  }
};
