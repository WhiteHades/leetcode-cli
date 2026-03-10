// Authentication commands tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockCredentialsStorage } from '../mocks/storage.js';
import { createMockLeetCodeClient } from '../mocks/leetcodeClient.js';
import { outputContains } from '../setup.js';
import inquirer from 'inquirer';

// We need to mock modules before importing the commands
vi.mock('../../storage/credentials.js', () => ({
  credentials: createMockCredentialsStorage(),
  describeCredentialStatus: vi.fn((status: { reason: string | null }) => {
    if (status.reason === 'KEYCHAIN_UNAVAILABLE') return 'System keychain is unavailable.';
    if (status.reason === 'LEGACY_CREDENTIALS_IGNORED') {
      return 'Legacy plaintext credentials were detected and ignored.';
    }
    return 'Not logged in. Run \"leetcode login\" to authenticate.';
  }),
}));

vi.mock('../../api/client.js', () => ({
  leetcodeClient: createMockLeetCodeClient(),
}));

// Mock inquirer for login prompts
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({
      session: 'test-session',
      csrfToken: 'test-csrf',
    }),
  },
}));

// Mock ora spinner
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

// Import after mocking
import { loginCommand, logoutCommand, whoamiCommand } from '../../commands/login.js';
import { credentials } from '../../storage/credentials.js';
import { leetcodeClient } from '../../api/client.js';

describe('Authentication Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginCommand', () => {
    it('should save credentials on successful login', async () => {
      vi.mocked(leetcodeClient.checkAuth).mockResolvedValue({
        isSignedIn: true,
        username: 'TestUser',
      });

      await loginCommand();

      expect(credentials.set).toHaveBeenCalled();
    });

    it('should not save credentials on failed login', async () => {
      vi.mocked(leetcodeClient.checkAuth).mockResolvedValue({
        isSignedIn: false,
        username: null,
      });

      await loginCommand();

      expect(credentials.set).not.toHaveBeenCalled();
    });

    it('should skip prompt and validate env creds in read-only env mode', async () => {
      vi.mocked(credentials.status).mockResolvedValue({
        mode: 'env-readonly',
        backend: 'keychain',
        source: 'env',
        hasCredentials: true,
        readOnly: true,
        reason: null,
        path: null,
      });
      vi.mocked(credentials.get).mockResolvedValue({
        session: 'env-session',
        csrfToken: 'env-csrf',
      });
      vi.mocked(leetcodeClient.checkAuth).mockResolvedValue({
        isSignedIn: true,
        username: 'EnvUser',
      });

      await loginCommand();

      expect(vi.mocked(inquirer.prompt)).not.toHaveBeenCalled();
      expect(credentials.set).not.toHaveBeenCalled();
      expect(outputContains('read-only')).toBe(true);
    });

    it('should stop early when keychain is unavailable', async () => {
      vi.mocked(credentials.status).mockResolvedValue({
        mode: 'keychain',
        backend: 'keychain',
        source: null,
        hasCredentials: false,
        readOnly: false,
        reason: 'KEYCHAIN_UNAVAILABLE',
        path: null,
      });

      await loginCommand();

      expect(vi.mocked(inquirer.prompt)).not.toHaveBeenCalled();
      expect(outputContains('System keychain is unavailable')).toBe(true);
    });
  });

  describe('logoutCommand', () => {
    it('should clear credentials', async () => {
      await logoutCommand();

      expect(credentials.clear).toHaveBeenCalled();
    });

    it('should show env-mode hint when logout is blocked by read-only env mode', async () => {
      vi.mocked(credentials.clear).mockResolvedValue({
        ok: false,
        reason: 'ENV_READONLY',
        mode: 'env-readonly',
        source: null,
        path: null,
        message:
          'Environment credential mode is read-only. Unset LEETCODE_SESSION and LEETCODE_CSRF_TOKEN to log out.',
      });

      await logoutCommand();

      expect(outputContains('Unset LEETCODE_SESSION and LEETCODE_CSRF_TOKEN')).toBe(true);
    });
  });

  describe('whoamiCommand', () => {
    it('should show username when logged in', async () => {
      vi.mocked(credentials.get).mockResolvedValue({
        session: 'test',
        csrfToken: 'test',
      });
      vi.mocked(leetcodeClient.checkAuth).mockResolvedValue({
        isSignedIn: true,
        username: 'TestUser',
      });

      await whoamiCommand();

      // Check that checkAuth was called
      expect(leetcodeClient.checkAuth).toHaveBeenCalled();
    });

    it('should show not logged in message when no credentials', async () => {
      vi.mocked(credentials.get).mockResolvedValue(null);
      vi.mocked(credentials.status).mockResolvedValue({
        mode: 'keychain',
        backend: 'keychain',
        source: null,
        hasCredentials: false,
        readOnly: false,
        reason: 'KEYCHAIN_UNAVAILABLE',
        path: null,
      });

      await whoamiCommand();

      expect(outputContains('System keychain is unavailable')).toBe(true);
    });

    it('should show relogin guidance when legacy credentials are detected', async () => {
      vi.mocked(credentials.get).mockResolvedValue(null);
      vi.mocked(credentials.status).mockResolvedValue({
        mode: 'keychain',
        backend: 'keychain',
        source: null,
        hasCredentials: false,
        readOnly: false,
        reason: 'LEGACY_CREDENTIALS_IGNORED',
        path: null,
      });

      await whoamiCommand();

      expect(outputContains('Legacy plaintext credentials were detected and ignored')).toBe(true);
    });
  });
});
