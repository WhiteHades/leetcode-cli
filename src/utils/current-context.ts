import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import striptags from 'striptags';
import type { ProblemDetail, TopicTag } from '../types.js';

interface CurrentProblemContextOptions {
  solutionPath?: string;
}

function firstTopic(problem: ProblemDetail): TopicTag {
  return (problem.topicTags ?? [])[0] ?? { name: 'Uncategorized', slug: 'uncategorized' };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&le;/g, '<=')
    .replace(/&ge;/g, '>=')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function htmlToText(content: string | null): string {
  if (!content) return 'Problem statement is not available from the API.';

  let text = content
    .replace(/<sup>(.*?)<\/sup>/gi, '^$1')
    .replace(/<strong class="example">Example (\d+):<\/strong>/gi, '\n\nExample $1:\n')
    .replace(/<strong>Constraints:<\/strong>/gi, '\n\nConstraints:\n')
    .replace(/<strong>Follow-up:<\/strong>/gi, '\n\nFollow-up:\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n');

  text = decodeEntities(striptags(text));
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildMarkdown(problem: ProblemDetail, options: CurrentProblemContextOptions): string {
  const topic = firstTopic(problem);
  const statement = htmlToText(problem.content);
  const topicTags = problem.topicTags ?? [];
  const hintsList = problem.hints ?? [];
  const topics = topicTags.map((tag) => tag.name).join(', ') || 'Uncategorized';
  const solutionPath = options.solutionPath ?? 'not picked yet';
  const hints =
    hintsList.length > 0
      ? hintsList.map((hint, index) => `${index + 1}. ${htmlToText(hint)}`).join('\n')
      : 'No hints returned by the API.';

  return `# ${problem.questionFrontendId}. ${problem.title}

- Slug: ${problem.titleSlug}
- URL: https://leetcode.com/problems/${problem.titleSlug}/
- Difficulty: ${problem.difficulty}
- Primary topic: ${topic.name} (${topic.slug})
- Topics: ${topics}
- Current solution: ${solutionPath}

## Statement

${statement}

## Example Testcases

${problem.exampleTestcases ?? 'No example testcases returned by the API.'}

## Sample Test Case

${problem.sampleTestCase ?? 'No sample test case returned by the API.'}

## Hints

${hints}
`;
}

export async function writeCurrentProblemContext(
  workDir: string,
  problem: ProblemDetail,
  options: CurrentProblemContextOptions = {}
): Promise<void> {
  const currentDir = join(workDir, '.current');
  const topic = firstTopic(problem);
  const statement = htmlToText(problem.content);
  const topicTags = problem.topicTags ?? [];
  const hints = problem.hints ?? [];
  const payload = {
    questionId: problem.questionId,
    questionFrontendId: problem.questionFrontendId,
    title: problem.title,
    titleSlug: problem.titleSlug,
    url: `https://leetcode.com/problems/${problem.titleSlug}/`,
    difficulty: problem.difficulty,
    isPaidOnly: problem.isPaidOnly,
    acRate: problem.acRate,
    status: problem.status,
    primaryTopic: topic,
    topicTags,
    statement,
    sampleTestCase: problem.sampleTestCase,
    exampleTestcases: problem.exampleTestcases,
    hints,
    solutionPath: options.solutionPath ?? null,
  };

  await mkdir(currentDir, { recursive: true });

  await Promise.all([
    writeFile(join(currentDir, 'problem-id'), `${problem.questionFrontendId}\n`, 'utf-8'),
    writeFile(join(currentDir, 'problem-slug'), `${problem.titleSlug}\n`, 'utf-8'),
    writeFile(join(currentDir, 'topic-name'), `${topic.name}\n`, 'utf-8'),
    writeFile(join(currentDir, 'topic-slug'), `${topic.slug}\n`, 'utf-8'),
    writeFile(join(currentDir, 'problem.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf-8'),
    writeFile(join(currentDir, 'problem.md'), buildMarkdown(problem, options), 'utf-8'),
  ]);

  if (options.solutionPath) {
    await Promise.all([
      writeFile(join(currentDir, 'id'), `${problem.questionFrontendId}\n`, 'utf-8'),
      writeFile(join(currentDir, 'path'), `${options.solutionPath}\n`, 'utf-8'),
    ]);
  }
}
