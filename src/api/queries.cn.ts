// GraphQL queries for leetcode.cn (China schema)
import {
  DAILY_CHALLENGE_QUERY as DAILY_CHALLENGE_QUERY_GLOBAL,
  PROBLEM_DETAIL_QUERY,
  PROBLEM_LIST_QUERY,
  RANDOM_PROBLEM_QUERY,
  SUBMISSION_DETAILS_QUERY,
  SUBMISSION_LIST_QUERY,
  USER_STATUS_QUERY,
  type QueryPack,
} from './queries.global.js';

export const DAILY_CHALLENGE_QUERY_CN = `
  query questionOfToday {
    todayRecord {
      date
      userStatus
      question {
        questionId
        frontendQuestionId: questionFrontendId
        difficulty
        title
        titleCn: translatedTitle
        titleSlug
        paidOnly: isPaidOnly
        acRate
        status
        topicTags {
          name
          nameTranslated: translatedName
          id
        }
      }
      lastSubmission {
        id
      }
    }
  }
`;

export const USER_PROFILE_QUERY_CN = `
  query getUserProfile($username: String!) {
    userProfileUserQuestionProgress(userSlug: $username) {
      numAcceptedQuestions {
        count
        difficulty
      }
    }
    userProfilePublicProfile(userSlug: $username) {
      siteRanking
      profile {
        userSlug
        realName
      }
    }
  }
`;

export const SKILL_STATS_QUERY_CN = `
  query skillStats($username: String!) {
    userProfilePublicProfile(userSlug: $username) {
      profile {
        skillSet {
          topicAreaScores {
            score
            topicArea {
              name
              slug
            }
          }
        }
      }
    }
  }
`;

export const CN_QUERY_PACK: QueryPack = {
  PROBLEM_LIST_QUERY,
  PROBLEM_DETAIL_QUERY,
  USER_STATUS_QUERY,
  USER_PROFILE_QUERY: USER_PROFILE_QUERY_CN,
  SKILL_STATS_QUERY: SKILL_STATS_QUERY_CN,
  DAILY_CHALLENGE_QUERY: DAILY_CHALLENGE_QUERY_CN,
  SUBMISSION_LIST_QUERY,
  RANDOM_PROBLEM_QUERY,
  SUBMISSION_DETAILS_QUERY,
};

// Export for testing or targeted use
export const CN_FALLBACK_DAILY_QUERY = DAILY_CHALLENGE_QUERY_GLOBAL;
