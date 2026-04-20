import { describe, expect, it } from 'vitest';
import {
  normalizeCnDailyChallenge,
  normalizeCnSkillStats,
  normalizeCnUserProfile,
} from '../../api/adapters/cn.js';

describe('cn adapters', () => {
  it('normalizes daily challenge payload from todayRecord', () => {
    const result = normalizeCnDailyChallenge({
      todayRecord: [
        {
          date: '2026-04-20',
          question: {
            questionId: '1',
            frontendQuestionId: '1',
            difficulty: 'Easy',
            title: 'Two Sum',
            titleCn: '两数之和',
            titleSlug: 'two-sum',
            paidOnly: false,
            acRate: 52.3,
            status: 'ac',
            topicTags: [{ name: 'Array', id: 'array' }],
          },
        },
      ],
    });

    expect(result.question.title).toBe('两数之和');
    expect(result.question.titleSlug).toBe('two-sum');
    expect(result.question.questionFrontendId).toBe('1');
    expect(result.link).toBe('/problems/two-sum/');
  });

  it('normalizes cn profile payload into shared user profile shape', () => {
    const profile = normalizeCnUserProfile('night-slayer', {
      userProfilePublicProfile: {
        siteRanking: 123,
        profile: {
          userSlug: 'night-slayer',
          realName: 'Night Slayer',
        },
      },
      userProfileUserQuestionProgress: {
        numAcceptedQuestions: [
          { difficulty: 'Easy', count: 10 },
          { difficulty: 'Medium', count: 7 },
          { difficulty: 'Hard', count: 2 },
        ],
      },
    });

    expect(profile.username).toBe('night-slayer');
    expect(profile.ranking).toBe(123);
    expect(profile.acSubmissionNum.find((entry) => entry.difficulty === 'All')?.count).toBe(19);
    expect(profile.streak).toBe(0);
    expect(profile.submissionCalendar).toBe('');
  });

  it('normalizes cn skill scores into three buckets', () => {
    const stats = normalizeCnSkillStats({
      userProfilePublicProfile: {
        profile: {
          skillSet: {
            topicAreaScores: [
              { score: 12, topicArea: { name: 'Array', slug: 'array' } },
              { score: 6, topicArea: { name: 'Graph', slug: 'graph' } },
              { score: 3, topicArea: { name: 'DP', slug: 'dynamic-programming' } },
            ],
          },
        },
      },
    });

    expect(stats.advanced.length).toBeGreaterThan(0);
    expect(stats.intermediate.length).toBeGreaterThan(0);
    expect(stats.fundamental.length).toBeGreaterThan(0);
  });
});
