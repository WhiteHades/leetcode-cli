import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProblemDetail } from '../../types.js';
import { writeCurrentProblemContext } from '../../utils/current-context.js';

let tempDir: string | null = null;

function makeProblem(): ProblemDetail {
  return {
    questionId: '1',
    questionFrontendId: '1',
    title: 'Two Sum',
    titleSlug: 'two-sum',
    difficulty: 'Easy',
    isPaidOnly: false,
    acRate: 59.1,
    topicTags: [
      { name: 'Array', slug: 'array' },
      { name: 'Hash Table', slug: 'hash-table' },
    ],
    status: null,
    content:
      '<p>Given an array of integers <code>nums</code> and an integer target.</p><p><strong class="example">Example 1:</strong></p><p>Input: nums = [2,7], target = 9</p>',
    codeSnippets: [],
    sampleTestCase: '[2,7]\n9',
    exampleTestcases: '[2,7]\n9',
    hints: ['Try storing seen numbers.'],
    companyTags: [],
    stats: '{}',
  };
}

async function makeWorkDir(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'leetcode-current-context-'));
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('current problem context', () => {
  it('writes current problem files without changing active solution sentinels', async () => {
    const workDir = await makeWorkDir();

    await writeCurrentProblemContext(workDir, makeProblem());

    const currentDir = join(workDir, '.current');
    await expect(readFile(join(currentDir, 'topic-slug'), 'utf-8')).resolves.toBe('array\n');
    await expect(readFile(join(currentDir, 'problem-id'), 'utf-8')).resolves.toBe('1\n');
    await expect(readFile(join(currentDir, 'problem-cache-md'), 'utf-8')).resolves.toBe(
      `${join(currentDir, 'problems', 'Easy', 'array', '1.two-sum.md')}\n`
    );

    const markdown = await readFile(join(currentDir, 'problem.md'), 'utf-8');
    expect(markdown).toContain('# 1. Two Sum');
    expect(markdown).toContain('- Primary topic: Array (array)');
    expect(markdown).toContain('Current solution: not picked yet');

    const cachedMarkdown = await readFile(
      join(currentDir, 'problems', 'Easy', 'array', '1.two-sum.md'),
      'utf-8'
    );
    expect(cachedMarkdown).toBe(markdown);

    await expect(readFile(join(currentDir, 'id'), 'utf-8')).rejects.toThrow();
    await expect(readFile(join(currentDir, 'path'), 'utf-8')).rejects.toThrow();
  });

  it('writes active solution sentinels when a solution path is known', async () => {
    const workDir = await makeWorkDir();
    const solutionPath = join(workDir, 'Easy', 'Array', '1.two-sum.ts');

    await writeCurrentProblemContext(workDir, makeProblem(), { solutionPath });

    const currentDir = join(workDir, '.current');
    await expect(readFile(join(currentDir, 'id'), 'utf-8')).resolves.toBe('1\n');
    await expect(readFile(join(currentDir, 'path'), 'utf-8')).resolves.toBe(`${solutionPath}\n`);

    const json = JSON.parse(await readFile(join(currentDir, 'problem.json'), 'utf-8'));
    expect(json.solutionPath).toBe(solutionPath);
    expect(json.primaryTopic).toEqual({ name: 'Array', slug: 'array' });

    const cachedJson = JSON.parse(
      await readFile(join(currentDir, 'problems', 'Easy', 'array', '1.two-sum.json'), 'utf-8')
    );
    expect(cachedJson.solutionPath).toBe(solutionPath);
  });

  it('uses an existing active solution path only when it matches the current problem', async () => {
    const workDir = await makeWorkDir();
    const currentDir = join(workDir, '.current');
    const solutionPath = join(workDir, 'Easy', 'Array', '1.two-sum.ts');
    await mkdir(currentDir, { recursive: true });
    await writeFile(join(currentDir, 'id'), '1\n');
    await writeFile(join(currentDir, 'path'), `${solutionPath}\n`);

    await writeCurrentProblemContext(workDir, makeProblem());

    const json = JSON.parse(await readFile(join(currentDir, 'problem.json'), 'utf-8'));
    expect(json.solutionPath).toBe(solutionPath);

    const markdown = await readFile(join(currentDir, 'problem.md'), 'utf-8');
    expect(markdown).toContain(`Current solution: ${solutionPath}`);
  });

  it('does not leak a stale active solution path into a different problem context', async () => {
    const workDir = await makeWorkDir();
    const currentDir = join(workDir, '.current');
    await mkdir(currentDir, { recursive: true });
    await writeFile(join(currentDir, 'id'), '2\n');
    await writeFile(join(currentDir, 'path'), `${join(workDir, 'Easy', 'Array', '2.add-two-numbers.ts')}\n`);

    await writeCurrentProblemContext(workDir, makeProblem());

    const json = JSON.parse(await readFile(join(currentDir, 'problem.json'), 'utf-8'));
    expect(json.solutionPath).toBeNull();

    const markdown = await readFile(join(currentDir, 'problem.md'), 'utf-8');
    expect(markdown).toContain('Current solution: not picked yet');
  });
});
