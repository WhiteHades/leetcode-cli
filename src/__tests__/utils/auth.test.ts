import { beforeEach, describe, expect, it, vi } from 'vitest';
import { outputContains } from '../setup.js';

const { mockCredentials, mockLeetCodeClient } = vi.hoisted(() => ({
  mockCredentials: {
    get: vi.fn(async () => null),
    status: vi.fn(async () => ({
      mode: 'keychain',
      backend: 'keychain',
      source: null,
      hasCredentials: false,
      readOnly: false,
      reason: null,
      path: null,
    })),
  },
  mockLeetCodeClient: {
    setCredentials: vi.fn(),
    checkAuth: vi.fn(),
  },
}));

vi.mock('../../storage/credentials.js', () => ({
  credentials: mockCredentials,
  describeCredentialStatus: vi.fn((status: { reason: string | null }) => {
    if (status.reason === 'KEYCHAIN_UNAVAILABLE') {
      return 'System keychain is unavailable.';
    }
    if (status.reason === 'LEGACY_CREDENTIALS_IGNORED') {
      return 'Legacy plaintext credentials were detected and ignored.';
    }
    return 'No credentials found.';
  }),
}));

vi.mock('../../storage/config.js', () => ({
  config: {
    getSite: vi.fn(() => 'leetcode.com'),
    getConfig: vi.fn(() => ({ site: 'leetcode.com' })),
  },
}));

vi.mock('../../api/client.js', () => ({
  leetcodeClient: mockLeetCodeClient,
}));

import { requireAuth } from '../../utils/auth.js';

describe('utils/auth requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show keychain unavailable guidance when credentials are missing', async () => {
    mockCredentials.get.mockResolvedValueOnce(null);
    mockCredentials.status.mockResolvedValueOnce({
      mode: 'keychain',
      backend: 'keychain',
      source: null,
      hasCredentials: false,
      readOnly: false,
      reason: 'KEYCHAIN_UNAVAILABLE',
      path: null,
    } as any);

    const result = await requireAuth();

    expect(result.authorized).toBe(false);
    expect(outputContains('System keychain is unavailable.')).toBe(true);
  });

  it('should show legacy relogin guidance when legacy credentials are detected', async () => {
    mockCredentials.get.mockResolvedValueOnce(null);
    mockCredentials.status.mockResolvedValueOnce({
      mode: 'keychain',
      backend: 'keychain',
      source: null,
      hasCredentials: false,
      readOnly: false,
      reason: 'LEGACY_CREDENTIALS_IGNORED',
      path: null,
    } as any);

    const result = await requireAuth();

    expect(result.authorized).toBe(false);
    expect(outputContains('Legacy plaintext credentials were detected and ignored.')).toBe(true);
  });
});
