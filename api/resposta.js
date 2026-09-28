/**
 * Guarda a resposta da pergunta do app ("topou") num banco Redis (Upstash,
 * ligado ao projeto pelo Marketplace da Vercel), para ela valer em qualquer
 * computador e aparecer na página secreta.
 *
 *   GET  /api/resposta → { configurado, topou, em }
 *   POST /api/resposta → grava que ela topou (a primeira data fica)
 */

const KEY = 'repertorio:resposta';

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(config, command) {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis respondeu ${res.status}`);
  return (await res.json()).result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const config = redisConfig();
  if (!config) {
    res.status(503).json({ configurado: false, topou: false, em: null });
    return;
  }
  try {
    if (req.method === 'POST') {
      // NX: se já tinha resposta, mantém a data da primeira.
      await redis(config, ['SET', KEY, JSON.stringify({ topou: true, em: new Date().toISOString() }), 'NX']);
    } else if (req.method !== 'GET') {
      res.status(405).json({ erro: 'use GET ou POST' });
      return;
    }
    const saved = await redis(config, ['GET', KEY]);
    const value = saved ? JSON.parse(saved) : { topou: false, em: null };
    res.status(200).json({ configurado: true, topou: !!value.topou, em: value.em ?? null });
  } catch (e) {
    res.status(502).json({ configurado: true, erro: String(e && e.message ? e.message : e) });
  }
};
