import type { LeetCodeSite } from '../types.js';
import { CN_QUERY_PACK } from './queries.cn.js';
import { GLOBAL_QUERY_PACK, type QueryPack } from './queries.global.js';

export function getQueryPack(site: LeetCodeSite): QueryPack {
  if (site === 'leetcode.cn') {
    return CN_QUERY_PACK;
  }
  return GLOBAL_QUERY_PACK;
}
