import type { DailyChallenge, Problem } from '../../types.js';

interface CnTopicTag {
  name?: string;
  nameTranslated?: string;
  id?: string | number;
}

interface CnQuestion {
  questionId?: string | number;
  frontendQuestionId?: string | number;
  questionFrontendId?: string | number;
  difficulty?: string;
  title?: string;
  titleCn?: string;
  titleSlug?: string;
  paidOnly?: boolean;
  isPaidOnly?: boolean;
  acRate?: number | string;
  status?: 'ac' | 'notac' | null;
  topicTags?: CnTopicTag[];
}

interface CnDailyRecord {
  date?: string;
  link?: string;
  question?: CnQuestion;
}

interface CnAcceptedItem {
  difficulty?: string;
  count?: number;
}

interface CnProfileShape {
  userProfilePublicProfile?: {
    siteRanking?: number;
    profile?: {
      userSlug?: string;
      realName?: string;
    };
  } | null;
  userProfileUserQuestionProgress?: {
    numAcceptedQuestions?: CnAcceptedItem[];
  } | null;
}

interface CnSkillScore {
  score?: number;
  topicArea?: {
    name?: string;
    slug?: string;
  } | null;
}

interface CnSkillShape {
  userProfilePublicProfile?: {
    profile?: {
      skillSet?: {
        topicAreaScores?: CnSkillScore[];
      } | null;
    } | null;
  } | null;
}

function toTitleCaseDifficulty(difficulty?: string): Problem['difficulty'] {
  const value = (difficulty ?? '').toLowerCase();
  if (value === 'easy') return 'Easy';
  if (value === 'hard') return 'Hard';
  return 'Medium';
}

function toStatus(status: string | null | undefined): Problem['status'] {
  if (status === 'ac' || status === 'notac') return status;
  return null;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toProblem(question: CnQuestion): Problem {
  const title = question.titleCn || question.title || 'Unknown Problem';
  const titleSlug = question.titleSlug || toSlug(title);
  const tags = (question.topicTags ?? []).map((tag) => {
    const tagName = tag.nameTranslated || tag.name || 'Tag';
    return {
      name: tagName,
      slug: tag.id !== undefined ? String(tag.id) : toSlug(tagName),
    };
  });

  return {
    questionId: String(question.questionId ?? ''),
    questionFrontendId: String(question.frontendQuestionId ?? question.questionFrontendId ?? ''),
    title,
    titleSlug,
    difficulty: toTitleCaseDifficulty(question.difficulty),
    isPaidOnly: Boolean(question.paidOnly ?? question.isPaidOnly),
    acRate: Number(question.acRate ?? 0),
    topicTags: tags,
    status: toStatus(question.status),
  };
}

export function normalizeCnDailyChallenge(input: { todayRecord?: CnDailyRecord[] }): DailyChallenge {
  const record = input.todayRecord?.[0];
  if (!record || !record.question) {
    throw new Error('No daily challenge found for leetcode.cn');
  }

  const problem = toProblem(record.question);

  return {
    date: record.date ?? new Date().toISOString().slice(0, 10),
    link: record.link || `/problems/${problem.titleSlug}/`,
    question: problem,
  };
}

export function normalizeCnUserProfile(
  username: string,
  input: CnProfileShape
): {
  username: string;
  realName: string;
  ranking: number;
  acSubmissionNum: Array<{ difficulty: string; count: number }>;
  streak: number;
  totalActiveDays: number;
  submissionCalendar: string;
} {
  const publicProfile = input.userProfilePublicProfile?.profile;
  const accepted = input.userProfileUserQuestionProgress?.numAcceptedQuestions ?? [];
  const countMap = new Map<string, number>([
    ['All', 0],
    ['Easy', 0],
    ['Medium', 0],
    ['Hard', 0],
  ]);

  for (const item of accepted) {
    const key = toTitleCaseDifficulty(item.difficulty);
    const value = Number(item.count ?? 0);
    countMap.set(key, value);
  }

  const all = (countMap.get('Easy') ?? 0) + (countMap.get('Medium') ?? 0) + (countMap.get('Hard') ?? 0);
  countMap.set('All', Math.max(countMap.get('All') ?? 0, all));

  return {
    username: publicProfile?.userSlug || username,
    realName: publicProfile?.realName || username,
    ranking: Number(input.userProfilePublicProfile?.siteRanking ?? 0),
    acSubmissionNum: [
      { difficulty: 'All', count: countMap.get('All') ?? 0 },
      { difficulty: 'Easy', count: countMap.get('Easy') ?? 0 },
      { difficulty: 'Medium', count: countMap.get('Medium') ?? 0 },
      { difficulty: 'Hard', count: countMap.get('Hard') ?? 0 },
    ],
    streak: 0,
    totalActiveDays: 0,
    submissionCalendar: '',
  };
}

export function normalizeCnSkillStats(input: CnSkillShape): {
  fundamental: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  intermediate: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
  advanced: Array<{ tagName: string; tagSlug: string; problemsSolved: number }>;
} {
  const topicScores = input.userProfilePublicProfile?.profile?.skillSet?.topicAreaScores ?? [];
  const ordered = topicScores
    .map((entry) => ({
      tagName: entry.topicArea?.name || 'Topic',
      tagSlug: entry.topicArea?.slug || toSlug(entry.topicArea?.name || 'topic'),
      problemsSolved: Math.max(0, Math.round(Number(entry.score ?? 0))),
    }))
    .sort((a, b) => b.problemsSolved - a.problemsSolved);

  if (ordered.length === 0) {
    return { fundamental: [], intermediate: [], advanced: [] };
  }

  const third = Math.max(1, Math.ceil(ordered.length / 3));
  const advanced = ordered.slice(0, third);
  const intermediate = ordered.slice(third, third * 2);
  const fundamental = ordered.slice(third * 2);

  return { fundamental, intermediate, advanced };
}
