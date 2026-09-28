import { afterEach, describe, expect, it, jest } from '@jest/globals';

// Função da Vercel (CommonJS, fora do app).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const handler = require('../../api/resposta.js') as (req: unknown, res: unknown) => Promise<void>;

function fakeRes() {
  const out: { status?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  const res = {
    setHeader: (k: string, v: string) => (out.headers[k] = v),
    status: (code: number) => {
      out.status = code;
      return res;
    },
    json: (body: unknown) => {
      out.body = body;
      return res;
    },
  };
  return { res, out };
}

/** Redis de mentira: guarda os SET e responde os GET, como a API REST do Upstash. */
function fakeRedis() {
  const store = new Map<string, string>();
  const commands: unknown[][] = [];
  const fetchMock = jest.fn(async (_url: unknown, init?: { body?: string }) => {
    const cmd = JSON.parse(init?.body ?? '[]') as string[];
    commands.push(cmd);
    let result: unknown = null;
    if (cmd[0] === 'SET') {
      if (!(cmd.includes('NX') && store.has(cmd[1]))) store.set(cmd[1], cmd[2]);
      result = 'OK';
    } else if (cmd[0] === 'GET') {
      result = store.get(cmd[1]) ?? null;
    }
    return { ok: true, json: async () => ({ result }) };
  });
  return { fetchMock, commands };
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

describe('api/resposta', () => {
  it('sem banco configurado avisa (503)', async () => {
    const { res, out } = fakeRes();
    await handler({ method: 'GET' }, res);
    expect(out.status).toBe(503);
    expect(out.body).toMatchObject({ configurado: false, topou: false });
  });

  it('antes: não topou; POST grava; depois todo mundo lê que topou, com a data da primeira vez', async () => {
    process.env.KV_REST_API_URL = 'https://redis.exemplo';
    process.env.KV_REST_API_TOKEN = 'segredo';
    const { fetchMock, commands } = fakeRedis();
    global.fetch = fetchMock as unknown as typeof fetch;

    const a = fakeRes();
    await handler({ method: 'GET' }, a.res);
    expect(a.out.body).toMatchObject({ configurado: true, topou: false, em: null });

    const b = fakeRes();
    await handler({ method: 'POST' }, b.res);
    expect(b.out.status).toBe(200);
    const first = (b.out.body as { em: string }).em;
    expect(b.out.body).toMatchObject({ topou: true });

    const c = fakeRes();
    await handler({ method: 'POST' }, c.res);
    expect((c.out.body as { em: string }).em).toBe(first);

    expect(commands[1]).toEqual(expect.arrayContaining(['SET', 'NX']));
    expect(a.out.headers['Cache-Control']).toBe('no-store');
  });
});
