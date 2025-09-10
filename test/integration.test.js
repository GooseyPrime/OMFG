/**
 * Additional tests for OMFG functionality
 */

const { loadConfig, validateConfig, createSyncPullRequest, performDirectSync } = require('../app/syncFork');

describe('OMFG Additional Tests', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      },
      payload: {
        repository: {
          owner: { login: 'testuser' },
          name: 'test-repo',
          full_name: 'testuser/test-repo'
        }
      },
      octokit: {
        repos: {
          getContent: jest.fn(),
          get: jest.fn()
        },
        git: {
          getRef: jest.fn(),
          createRef: jest.fn(),
          updateRef: jest.fn()
        },
        pulls: {
          create: jest.fn()
        }
      }
    };
  });

  describe('Configuration Edge Cases', () => {
    it('should handle null configuration', () => {
      const result = validateConfig(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should handle undefined configuration', () => {
      const result = validateConfig(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should handle non-object configuration', () => {
      const result = validateConfig('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should validate complex configuration with all optional fields', () => {
      const config = {
        auto_sync: false,
        upstream: 'owner/repo',
        branches: ['main', 'develop', 'feature'],
        create_pr: false,
        pr_title: 'Custom sync title',
        pr_body: 'Custom sync body with {upstream} and {branch}'
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createSyncPullRequest', () => {
    it('should create PR with custom configuration', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo',
        pr_title: 'Custom sync: {branch}',
        pr_body: 'Syncing {commits_behind} commits from {upstream}'
      };

      const comparison = {
        base_branch: 'main',
        behind_by: 3,
        commits: [
          { sha: 'abc123', commit: { message: 'Fix bug\nDetailed description' } },
          { sha: 'def456', commit: { message: 'Add feature' } }
        ]
      };

      mockContext.octokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'upstream-sha' } }
      });

      mockContext.octokit.git.createRef.mockResolvedValue({});

      mockContext.octokit.pulls.create.mockResolvedValue({
        data: { number: 123 }
      });

      const result = await createSyncPullRequest(mockContext, config, comparison);

      expect(result.number).toBe(123);
      expect(mockContext.octokit.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom sync: main',
          body: expect.stringContaining('Syncing 3 commits from upstream/repo')
        })
      );
    });

    it('should handle PR creation failure', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo'
      };

      const comparison = {
        base_branch: 'main',
        behind_by: 1,
        commits: []
      };

      mockContext.octokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'upstream-sha' } }
      });

      mockContext.octokit.git.createRef.mockResolvedValue({});

      mockContext.octokit.pulls.create.mockRejectedValue({
        message: 'PR creation failed'
      });

      await expect(createSyncPullRequest(mockContext, config, comparison))
        .rejects.toThrow('Failed to create sync pull request');
    });
  });

  describe('performDirectSync', () => {
    it('should perform direct sync successfully', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo'
      };

      const comparison = {
        base_branch: 'main'
      };

      mockContext.octokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'upstream-sha' } }
      });

      mockContext.octokit.git.updateRef.mockResolvedValue({});

      await performDirectSync(mockContext, config, comparison);

      expect(mockContext.octokit.git.updateRef).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'test-repo',
        ref: 'heads/main',
        sha: 'upstream-sha'
      });

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'Directly synced testuser/test-repo with upstream'
      );
    });

    it('should handle direct sync failure', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo'
      };

      const comparison = {
        base_branch: 'main'
      };

      mockContext.octokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'upstream-sha' } }
      });

      mockContext.octokit.git.updateRef.mockRejectedValue({
        message: 'Update failed'
      });

      await expect(performDirectSync(mockContext, config, comparison))
        .rejects.toThrow('Failed to perform direct sync');
    });
  });

  describe('Error Handling', () => {
    it('should handle YAML parsing errors in loadConfig', async () => {
      const invalidYaml = 'invalid: yaml: content:';
      
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(invalidYaml).toString('base64')
        }
      });

      // Mock yaml.load to throw an error
      const yaml = require('js-yaml');
      const originalLoad = yaml.load;
      yaml.load = jest.fn().mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      await expect(loadConfig(mockContext)).rejects.toThrow('Failed to load .omfg.yml');

      // Restore original function
      yaml.load = originalLoad;
    });
  });
});