import { describe, expect, it } from 'vitest';
import { getQueryPack } from '../../api/query-resolver.js';
import { DAILY_CHALLENGE_QUERY as DAILY_CHALLENGE_QUERY_GLOBAL } from '../../api/queries.global.js';
import { DAILY_CHALLENGE_QUERY_CN } from '../../api/queries.cn.js';

describe('query resolver', () => {
  it('returns global query pack for leetcode.com', () => {
    const pack = getQueryPack('leetcode.com');
    expect(pack.DAILY_CHALLENGE_QUERY).toContain('activeDailyCodingChallengeQuestion');
    expect(pack.DAILY_CHALLENGE_QUERY).toBe(DAILY_CHALLENGE_QUERY_GLOBAL);
  });

  it('returns cn query pack for leetcode.cn', () => {
    const pack = getQueryPack('leetcode.cn');
    expect(pack.DAILY_CHALLENGE_QUERY).toContain('todayRecord');
    expect(pack.DAILY_CHALLENGE_QUERY).toBe(DAILY_CHALLENGE_QUERY_CN);
  });
});
