const { run } = require('../src/index');
const core = require('@actions/core');

// Mock the @actions/core module
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  debug: jest.fn()
}));

// Mock @actions/github
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    ref: 'refs/heads/main'
  },
  getOctokit: jest.fn(() => ({
    rest: {
      repos: {
        get: jest.fn().mockResolvedValue({
          data: {
            fork: true,
            parent: {
              full_name: 'upstream-owner/upstream-repo'
            }
          }
        })
      }
    }
  }))
}));

// Mock simple-git
jest.mock('simple-git', () => {
  return jest.fn(() => ({
    addConfig: jest.fn().mockResolvedValue({}),
    addRemote: jest.fn().mockResolvedValue({}),
    fetch: jest.fn().mockResolvedValue({}),
    revparse: jest.fn().mockResolvedValue('main'),
    status: jest.fn().mockResolvedValue({
      behind: 0,
      ahead: 0,
      conflicted: []
    }),
    diffSummary: jest.fn().mockResolvedValue({
      files: []
    }),
    merge: jest.fn().mockResolvedValue({}),
    rebase: jest.fn().mockResolvedValue({})
  }));
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default input mocks
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'github-token': 'fake-token',
        'upstream-repo': '',
        'conflict-strategy': 'merge',
        'include-patterns': '*',
        'exclude-patterns': '',
      };
      return inputs[name] || '';
    });
    
    core.getBooleanInput.mockImplementation((name) => {
      const inputs = {
        'dry-run': false,
        'sync-code': true,
        'sync-workflows': false,
        'sync-secrets': false,
        'require-approval': false
      };
      return inputs[name] || false;
    });
  });

  test('should run successfully with minimal configuration', async () => {
    await run();
    
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith('🚀 Starting OMFG sync process...');
    expect(core.setOutput).toHaveBeenCalledWith('sync-status', 'success');
  });

  test('should handle dry-run mode', async () => {
    core.getBooleanInput.mockImplementation((name) => {
      if (name === 'dry-run') return true;
      if (name === 'sync-code') return true;
      return false;
    });

    await run();
    
    expect(core.info).toHaveBeenCalledWith('🔍 Running in dry-run mode - no changes will be applied');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test('should handle invalid inputs', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'conflict-strategy') return 'invalid-strategy';
      if (name === 'github-token') return 'fake-token';
      return '';
    });

    await run();
    
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Invalid conflict-strategy')
    );
  });
});