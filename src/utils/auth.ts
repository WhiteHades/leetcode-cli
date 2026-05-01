import chalk from 'chalk';
import { leetcodeClient } from '../api/client.js';
import * as credentialStore from '../storage/credentials.js';
import { config } from '../storage/config.js';
import type { LeetCodeSite } from '../types.js';
import { DEFAULT_LEETCODE_SITE, normalizeLeetCodeSiteInput } from './site.js';

const { credentials } = credentialStore;

function readConfiguredSite(): LeetCodeSite {
  const configWithSite = config as unknown as {
    getSite?: () => string;
    getConfig?: () => { site?: string };
  };

  const fromGetter =
    typeof configWithSite.getSite === 'function' ? configWithSite.getSite() : undefined;

  if (typeof fromGetter === 'string') {
    return normalizeLeetCodeSiteInput(fromGetter) ?? DEFAULT_LEETCODE_SITE;
  }

  const fromConfig = configWithSite.getConfig?.()?.site;
  if (typeof fromConfig === 'string') {
    return normalizeLeetCodeSiteInput(fromConfig) ?? DEFAULT_LEETCODE_SITE;
  }

  return DEFAULT_LEETCODE_SITE;
}

export function configureLeetCodeClientSite(site?: LeetCodeSite): LeetCodeSite {
  const resolvedSite = site ?? readConfiguredSite();
  const siteAwareClient = leetcodeClient as unknown as {
    setSite?: (nextSite: LeetCodeSite) => void;
  };

  if (typeof siteAwareClient.setSite === 'function') {
    siteAwareClient.setSite(resolvedSite);
  }

  return resolvedSite;
}

export async function validateSession(): Promise<boolean> {
  configureLeetCodeClientSite();

  const creds = await credentials.get();
  if (!creds) return false;

  try {
    leetcodeClient.setCredentials(creds);
    const { isSignedIn } = await leetcodeClient.checkAuth();
    return isSignedIn;
  } catch {
    return false;
  }
}

export async function requireAuth(): Promise<{ authorized: boolean; username?: string }> {
  configureLeetCodeClientSite();

  const creds = await credentials.get();

  if (!creds) {
    try {
      const status = await credentials.status();
      const message =
        typeof credentialStore.describeCredentialStatus === 'function'
          ? credentialStore.describeCredentialStatus(status)
          : 'Please login first: leetcode login';
      console.log(chalk.yellow(`⚠️  ${message}`));
    } catch {
      console.log(chalk.yellow('⚠️  Please login first: leetcode login'));
    }
    return { authorized: false };
  }

  try {
    leetcodeClient.setCredentials(creds);
    const { isSignedIn, username } = await leetcodeClient.checkAuth();

    if (!isSignedIn) {
      console.log(chalk.yellow('⚠️  Session expired. Please run: leetcode login'));
      return { authorized: false };
    }

    return { authorized: true, username: username ?? undefined };
  } catch {
    console.log(chalk.yellow('⚠️  Session validation failed. Please run: leetcode login'));
    return { authorized: false };
  }
}

export async function setupClientIfLoggedIn(): Promise<boolean> {
  configureLeetCodeClientSite();

  const creds = await credentials.get();

  if (!creds) {
    return false;
  }

  leetcodeClient.setCredentials(creds);
  return true;
}

export async function getCurrentUsername(): Promise<string | null> {
  configureLeetCodeClientSite();

  const creds = await credentials.get();
  if (!creds) return null;

  try {
    leetcodeClient.setCredentials(creds);
    const { isSignedIn, username } = await leetcodeClient.checkAuth();
    return isSignedIn ? (username ?? null) : null;
  } catch {
    return null;
  }
}
