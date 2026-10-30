/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getTimeOfDayAnalyticsFromEngine,
  getTimeOfDayAnalyticsFromEngineBatched,
} from '../analyticsEngineQuery';

const env = { CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_API_TOKEN: 'tok' } as any;

function mockFetch(rowsPerCall: any[][]) {
  const queries: string[] = [];
  let i = 0;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
    queries.push(String(init.body));
    const data = rowsPerCall[Math.min(i++, rowsPerCall.length - 1)];
    return new Response(JSON.stringify({ data, meta: [], rows: data.length }), { status: 200 });
  }));
  return queries;
}

afterEach(() => vi.unstubAllGlobals());

describe('getTimeOfDayAnalyticsFromEngine', () => {
  it('returns [] without credentials (no request made)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await getTimeOfDayAnalyticsFromEngine({} as any, { domainNames: ['a.com'] }, '2026-10-01', '2026-10-07');
    expect(out).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps rows to hour/weekday/clicks and shifts by the timezone offset', async () => {
    const queries = mockFetch([[{ hour: '14', weekday: '3', clicks: '7' }]]);
    const out = await getTimeOfDayAnalyticsFromEngine(env, { domainNames: ['a.com'] }, '2026-10-01', '2026-10-07', -180);
    expect(out).toEqual([{ hour: 14, weekday: 3, clicks: 7 }]);
    expect(queries[0]).toContain('double1 + -10800');
    expect(queries[0]).toContain("blob2 IN ('a.com')");
  });

  it('never selects IPs or other personal fields', async () => {
    const queries = mockFetch([[]]);
    await getTimeOfDayAnalyticsFromEngine(env, { domainNames: ['a.com'] }, '2026-10-01', '2026-10-07');
    expect(queries[0]).not.toMatch(/blob9|blob7|blob8/);
  });

  it('clamps absurd offsets so nothing but a bounded integer reaches the SQL', async () => {
    const queries = mockFetch([[]]);
    await getTimeOfDayAnalyticsFromEngine(env, { domainNames: ['a.com'] }, '2026-10-01', '2026-10-07', 999999);
    expect(queries[0]).toContain('double1 + 50400');
    const q2 = mockFetch([[]]);
    await getTimeOfDayAnalyticsFromEngine(env, { domainNames: ['a.com'] }, '2026-10-01', '2026-10-07', Number('1; DROP' as any));
    expect(q2[0]).toContain('double1 + 0');
  });
});

describe('getTimeOfDayAnalyticsFromEngineBatched', () => {
  it('sums the same hour/weekday across batches of 100 link ids', async () => {
    const ids = Array.from({ length: 150 }, (_, n) => `link${n}`);
    mockFetch([
      [{ hour: 9, weekday: 1, clicks: 5 }, { hour: 10, weekday: 1, clicks: 2 }],
      [{ hour: 9, weekday: 1, clicks: 3 }],
    ]);
    const out = await getTimeOfDayAnalyticsFromEngineBatched(env, ids, '2026-10-01', '2026-10-07');
    expect(out).toEqual([{ hour: 9, weekday: 1, clicks: 8 }, { hour: 10, weekday: 1, clicks: 2 }]);
  });
});
