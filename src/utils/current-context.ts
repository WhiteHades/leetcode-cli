import { mkdir, readFile, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import striptags from 'striptags';
import type { ProblemDetail, TopicTag } from '../types.js';

interface CurrentProblemContextOptions {
  solutionPath?: string;
}

function firstTopic(problem: ProblemDetail): TopicTag {
  return (problem.topicTags ?? [])[0] ?? { name: 'Uncategorized', slug: 'uncategorized' };
}

function pathSegment(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

function solutionPathMatches(problem: ProblemDetail, solutionPath: string): boolean {
  const name = basename(solutionPath);
  const id = problem.questionFrontendId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const slug = problem.titleSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${id}\\.${slug}\\.[^.]+$`).test(name);
}

async function readActiveSolutionPath(
  currentDir: string,
  problem: ProblemDetail
): Promise<string | null> {
  try {
    const [activeId, activePath] = await Promise.all([
      readFile(join(currentDir, 'id'), 'utf-8'),
      readFile(join(currentDir, 'path'), 'utf-8'),
    ]);
    const solutionPath = activePath.trim();
    if (activeId.trim() !== problem.questionFrontendId) return null;
    if (!solutionPathMatches(problem, solutionPath)) return null;
    return solutionPath;
  } catch {
    return null;
  }
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

function buildMarkdown(problem: ProblemDetail, solutionPath: string | null): string {
  const topic = firstTopic(problem);
  const statement = htmlToText(problem.content);
  const topicTags = problem.topicTags ?? [];
  const hintsList = problem.hints ?? [];
  const topics = topicTags.map((tag) => tag.name).join(', ') || 'Uncategorized';
  const currentSolution = solutionPath ?? 'not picked yet';
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
- Current solution: ${currentSolution}

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
  const solutionPath = options.solutionPath ?? (await readActiveSolutionPath(currentDir, problem));
  const markdown = buildMarkdown(problem, solutionPath);
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
    solutionPath,
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const archiveDir = join(
    currentDir,
    'problems',
    pathSegment(problem.difficulty),
    pathSegment(topic.slug)
  );
  const archiveStem = `${pathSegment(problem.questionFrontendId)}.${pathSegment(problem.titleSlug)}`;
  const archiveMarkdownPath = join(archiveDir, `${archiveStem}.md`);
  const archiveJsonPath = join(archiveDir, `${archiveStem}.json`);

  await Promise.all([mkdir(currentDir, { recursive: true }), mkdir(archiveDir, { recursive: true })]);

  await Promise.all([
    writeFile(join(currentDir, 'problem-id'), `${problem.questionFrontendId}\n`, 'utf-8'),
    writeFile(join(currentDir, 'problem-slug'), `${problem.titleSlug}\n`, 'utf-8'),
    writeFile(join(currentDir, 'topic-name'), `${topic.name}\n`, 'utf-8'),
    writeFile(join(currentDir, 'topic-slug'), `${topic.slug}\n`, 'utf-8'),
    writeFile(join(currentDir, 'problem-cache-md'), `${archiveMarkdownPath}\n`, 'utf-8'),
    writeFile(join(currentDir, 'problem-cache-json'), `${archiveJsonPath}\n`, 'utf-8'),
    writeFile(join(currentDir, 'problem.json'), json, 'utf-8'),
    writeFile(join(currentDir, 'problem.md'), markdown, 'utf-8'),
    writeFile(archiveJsonPath, json, 'utf-8'),
    writeFile(archiveMarkdownPath, markdown, 'utf-8'),
  ]);

  if (options.solutionPath) {
    await Promise.all([
      writeFile(join(currentDir, 'id'), `${problem.questionFrontendId}\n`, 'utf-8'),
      writeFile(join(currentDir, 'path'), `${options.solutionPath}\n`, 'utf-8'),
    ]);
  }
}
