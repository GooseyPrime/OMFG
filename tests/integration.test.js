const { syncFork, loadConfig, validateConfig } = require('../app/syncFork');

// Mock GitHub API responses
const mockContext = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  octokit: {
    repos: {
      get: jest.fn(),
      getContent: jest.fn(),
      compareCommitsWithBasehead: jest.fn()
    },
    pulls: {
      create: jest.fn()
    },
    git: {
      createRef: jest.fn(),
      updateRef: jest.fn()
    }
  },
  payload: {
    repository: {
      name: 'test-repo',
      full_name: 'test-owner/test-repo',
      owner: { login: 'test-owner' },
      default_branch: 'main'
    }
  }
};

describe('OMFG GitHub App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    test('should load valid configuration', async () => {
      const mockConfig = {
        auto_sync: true,
        upstream: 'GooseyPrime/OMFG',
        create_pr: true
      };

      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(mockConfig)).toString('base64')
        }
      });

      const config = await loadConfig(mockContext);
      expect(config).toEqual(mockConfig);
    });

    test('should handle missing config file', async () => {
      mockContext.octokit.repos.getContent.mockRejectedValue({
        status: 404
      });

      const config = await loadConfig(mockContext);
      expect(config).toBeNull();
    });
  });

  describe('validateConfig', () => {
    test('should validate correct configuration', () => {
      const validConfig = {
        auto_sync: true,
        upstream: 'GooseyPrime/OMFG'
      };

      const result = validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid configuration', () => {
      const invalidConfig = {
        auto_sync: 'not-boolean',
        upstream: ''
      };

      const result = validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('syncFork', () => {
    test('should handle missing configuration gracefully', async () => {
      // Test that syncFork properly handles a null config
      await expect(syncFork(mockContext, null)).rejects.toThrow();
    });

    test('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        auto_sync: 'not-boolean',
        upstream: ''
      };

      await expect(syncFork(mockContext, invalidConfig)).rejects.toThrow();
    });
  });
});
