/**
 * Tests for OMFG sync fork functionality
 */

const { loadConfig, validateConfig, compareForkWithUpstream, syncFork } = require('../app/syncFork');

// Mock js-yaml
jest.mock('js-yaml');
const yaml = require('js-yaml');

describe('OMFG syncFork module', () => {
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
          get: jest.fn(),
          compareCommitsWithBasehead: jest.fn()
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load valid configuration from .omfg.yml', async () => {
      const configContent = `auto_sync: true
upstream: upstream/repo`;
      
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(configContent).toString('base64')
        }
      });
      
      yaml.load.mockReturnValue({
        auto_sync: true,
        upstream: 'upstream/repo'
      });

      const config = await loadConfig(mockContext);

      expect(config).toEqual({
        auto_sync: true,
        upstream: 'upstream/repo'
      });
      expect(mockContext.octokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'test-repo',
        path: '.omfg.yml'
      });
    });

    it('should return null when .omfg.yml is not found', async () => {
      mockContext.octokit.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not Found'
      });

      const config = await loadConfig(mockContext);

      expect(config).toBeNull();
    });

    it('should throw error for other API failures', async () => {
      mockContext.octokit.repos.getContent.mockRejectedValue({
        status: 500,
        message: 'Internal Server Error'
      });

      await expect(loadConfig(mockContext)).rejects.toThrow('Failed to load .omfg.yml');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo'
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration without auto_sync', () => {
      const config = {
        upstream: 'upstream/repo'
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('auto_sync must be a boolean');
    });

    it('should reject configuration without upstream', () => {
      const config = {
        auto_sync: true
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('upstream must be a string in format "owner/repo"');
    });

    it('should reject upstream without slash', () => {
      const config = {
        auto_sync: true,
        upstream: 'invalidupstream'
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('upstream must be in format "owner/repo"');
    });

    it('should validate optional fields', () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo',
        branches: ['main', 'develop'],
        create_pr: false,
        pr_title: 'Custom title',
        pr_body: 'Custom body'
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid optional fields', () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo',
        branches: 'not-an-array',
        create_pr: 'not-a-boolean'
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('branches must be an array');
      expect(result.errors).toContain('create_pr must be a boolean');
    });
  });

  describe('compareForkWithUpstream', () => {
    it('should compare fork with upstream successfully', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo'
      };

      mockContext.octokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      mockContext.octokit.repos.compareCommitsWithBasehead.mockResolvedValue({
        data: {
          behind_by: 3,
          ahead_by: 0,
          status: 'behind',
          commits: [
            { sha: 'abc123', commit: { message: 'Fix bug' } },
            { sha: 'def456', commit: { message: 'Add feature' } }
          ]
        }
      });

      const result = await compareForkWithUpstream(mockContext, config);

      expect(result).toEqual({
        behind_by: 3,
        ahead_by: 0,
        status: 'behind',
        commits: [
          { sha: 'abc123', commit: { message: 'Fix bug' } },
          { sha: 'def456', commit: { message: 'Add feature' } }
        ],
        base_branch: 'main'
      });
    });

    it('should handle comparison API failures', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo'
      };

      mockContext.octokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      mockContext.octokit.repos.compareCommitsWithBasehead.mockRejectedValue({
        message: 'Comparison failed'
      });

      await expect(compareForkWithUpstream(mockContext, config)).rejects.toThrow('Failed to compare fork with upstream');
    });
  });

  describe('syncFork', () => {
    it('should skip sync when fork is up to date', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo'
      };

      mockContext.octokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      mockContext.octokit.repos.compareCommitsWithBasehead.mockResolvedValue({
        data: {
          behind_by: 0,
          ahead_by: 0,
          status: 'identical',
          commits: []
        }
      });

      const result = await syncFork(mockContext, config);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Fork is already up to date');
      expect(mockContext.log.info).toHaveBeenCalledWith('Fork testuser/test-repo is up to date with upstream');
    });

    it('should create PR for sync when fork is behind', async () => {
      const config = {
        auto_sync: true,
        upstream: 'upstream/repo',
        create_pr: true
      };

      mockContext.octokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      mockContext.octokit.repos.compareCommitsWithBasehead.mockResolvedValue({
        data: {
          behind_by: 2,
          ahead_by: 0,
          status: 'behind',
          commits: [
            { sha: 'abc123', commit: { message: 'Fix bug' } }
          ]
        }
      });

      mockContext.octokit.git.getRef.mockResolvedValue({
        data: { object: { sha: 'latest-sha' } }
      });

      mockContext.octokit.git.createRef.mockResolvedValue({});

      mockContext.octokit.pulls.create.mockResolvedValue({
        data: { number: 42 }
      });

      const result = await syncFork(mockContext, config);

      expect(result.success).toBe(true);
      expect(result.commits_synced).toBe(2);
      expect(mockContext.octokit.pulls.create).toHaveBeenCalled();
      expect(mockContext.log.info).toHaveBeenCalledWith('Created sync PR #42 in testuser/test-repo');
    });
  });
});