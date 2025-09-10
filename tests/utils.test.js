const { loadConfig, validateConfig } = require('../app/syncFork');

describe('OMFG Sync Utils', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      octokit: {
        repos: {
          get: jest.fn(),
          getContent: jest.fn()
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
          owner: { login: 'test-owner' },
          default_branch: 'main'
        }
      }
    };
  });

  describe('validateConfig', () => {
    test('should pass with valid configuration', () => {
      const config = {
        auto_sync: true,
        upstream: 'GooseyPrime/OMFG',
        create_pr: true,
        pr_title: 'Sync with upstream',
        pr_body: 'Auto-sync changes'
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail with invalid auto_sync type', () => {
      const config = {
        auto_sync: 'not-boolean',
        upstream: 'GooseyPrime/OMFG'
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('auto_sync must be a boolean');
    });

    test('should fail with missing upstream', () => {
      const config = {
        auto_sync: true,
        upstream: ''
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('upstream must be a string in format "owner/repo"');
    });

    test('should fail with invalid upstream format', () => {
      const config = {
        auto_sync: true,
        upstream: 'invalid-format'
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('upstream must be in format "owner/repo"');
    });

    test('should handle optional parameters', () => {
      const config = {
        auto_sync: true,
        upstream: 'GooseyPrime/OMFG',
        create_pr: false,
        branch: 'develop',
        pr_title: 'Custom title',
        pr_body: 'Custom body'
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('loadConfig', () => {
    test('should load valid YAML configuration', async () => {
      const configYaml = `
auto_sync: true
upstream: GooseyPrime/OMFG
create_pr: true
pr_title: "Sync with upstream"
pr_body: "Auto-sync changes"
`;

      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(configYaml).toString('base64')
        }
      });

      const config = await loadConfig(mockContext);
      expect(config).toEqual({
        auto_sync: true,
        upstream: 'GooseyPrime/OMFG',
        create_pr: true,
        pr_title: 'Sync with upstream',
        pr_body: 'Auto-sync changes'
      });
    });

    test('should return null for missing config file', async () => {
      mockContext.octokit.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not Found'
      });

      const config = await loadConfig(mockContext);
      expect(config).toBeNull();
    });

    test('should throw error for API failures', async () => {
      mockContext.octokit.repos.getContent.mockRejectedValue({
        status: 500,
        message: 'Internal Server Error'
      });

      await expect(loadConfig(mockContext)).rejects.toThrow('Failed to load .omfg.yml');
    });
  });
});