import type { LeetCodeSite } from '../types.js';

export const DEFAULT_LEETCODE_SITE: LeetCodeSite = 'leetcode.com';
export const SUPPORTED_LEETCODE_SITES: readonly LeetCodeSite[] = ['leetcode.com', 'leetcode.cn'];

const SITE_ALIAS_MAP: Record<string, LeetCodeSite> = {
  'leetcode.com': 'leetcode.com',
  leetcodecom: 'leetcode.com',
  com: 'leetcode.com',
  global: 'leetcode.com',
  'leetcode.cn': 'leetcode.cn',
  leetcodecn: 'leetcode.cn',
  cn: 'leetcode.cn',
  china: 'leetcode.cn',
};

export function normalizeLeetCodeSiteInput(input: string): LeetCodeSite | null {
  return SITE_ALIAS_MAP[input.trim().toLowerCase()] ?? null;
}

export function getLeetCodeSiteLabel(site: LeetCodeSite): string {
  if (site === 'leetcode.cn') {
    return 'leetcode.cn (China)';
  }
  return 'leetcode.com (Global)';
}
