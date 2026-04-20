import { describe, expect, it } from 'vitest';
import { SubmissionResultSchema } from '../../schemas/api.js';

describe('SubmissionResultSchema', () => {
  it('accepts null percentile fields for non-accepted submissions', () => {
    const parsed = SubmissionResultSchema.parse({
      status_code: 11,
      status_msg: 'Wrong Answer',
      state: 'SUCCESS',
      run_success: false,
      total_correct: 59,
      total_testcases: 63,
      status_runtime: 'N/A',
      status_memory: 'N/A',
      runtime_percentile: null,
      memory_percentile: null,
      code_output: '[1,2]',
      expected_output: '[0,1]',
      last_testcase: '[3,2,4]\n6',
    });

    expect(parsed.runtime_percentile).toBeNull();
    expect(parsed.memory_percentile).toBeNull();
    expect(parsed.status_msg).toBe('Wrong Answer');
  });
});
