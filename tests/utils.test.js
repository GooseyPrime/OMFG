const { validateInputs, summarizeChanges, shouldProcessFile, matchesPattern } = require('../src/utils');

describe('Utils', () => {
  describe('validateInputs', () => {
    test('should pass with valid inputs', async () => {
      const inputs = {
        conflictStrategy: 'merge',
        upstreamRepo: 'owner/repo',
        syncCode: true,
        syncWorkflows: false,
        syncSecrets: false
      };

      await expect(validateInputs(inputs)).resolves.not.toThrow();
    });

    test('should throw error for invalid conflict strategy', async () => {
      const inputs = {
        conflictStrategy: 'invalid',
        syncCode: true,
        syncWorkflows: false,
        syncSecrets: false
      };

      await expect(validateInputs(inputs)).rejects.toThrow('Invalid conflict-strategy');
    });

    test('should throw error when no sync options enabled', async () => {
      const inputs = {
        conflictStrategy: 'merge',
        syncCode: false,
        syncWorkflows: false,
        syncSecrets: false
      };

      await expect(validateInputs(inputs)).rejects.toThrow('At least one sync option must be enabled');
    });

    test('should throw error for invalid upstream repo format', async () => {
      const inputs = {
        conflictStrategy: 'merge',
        upstreamRepo: 'invalid-format',
        syncCode: true,
        syncWorkflows: false,
        syncSecrets: false
      };

      await expect(validateInputs(inputs)).rejects.toThrow('Invalid upstream-repo format');
    });
  });

  describe('summarizeChanges', () => {
    test('should create summary for successful sync', () => {
      const syncResult = {
        status: 'success',
        filesChanged: 3,
        conflicts: [],
        changes: [
          { type: 'code', action: 'synced', file: 'src/index.js', insertions: 10, deletions: 2 },
          { type: 'workflow', action: 'synced', file: '.github/workflows/ci.yml' }
        ],
        error: null
      };

      const summary = summarizeChanges(syncResult);
      expect(summary).toContain('**Sync Status:** SUCCESS');
      expect(summary).toContain('**Files Changed:** 3');
      expect(summary).toContain('src/index.js');
      expect(summary).toContain('+10/-2');
    });

    test('should include conflicts in summary', () => {
      const syncResult = {
        status: 'conflicts',
        filesChanged: 1,
        conflicts: ['src/config.js', 'README.md'],
        changes: [],
        error: null
      };

      const summary = summarizeChanges(syncResult);
      expect(summary).toContain('**Conflicts:** 2');
      expect(summary).toContain('src/config.js');
      expect(summary).toContain('README.md');
    });
  });

  describe('shouldProcessFile', () => {
    test('should include all files with default patterns', () => {
      expect(shouldProcessFile('any-file.js', '*', '')).toBe(true);
      expect(shouldProcessFile('any-file.md', '', '')).toBe(true);
    });

    test('should respect include patterns', () => {
      expect(shouldProcessFile('index.js', '*.js', '')).toBe(true);
      expect(shouldProcessFile('index.ts', '*.js', '')).toBe(false);
      expect(shouldProcessFile('src/index.js', 'src/**', '')).toBe(true);
      expect(shouldProcessFile('docs/README.md', 'src/**,docs/**', '')).toBe(true);
    });

    test('should respect exclude patterns', () => {
      expect(shouldProcessFile('node_modules/package.json', '*', 'node_modules/**')).toBe(false);
      expect(shouldProcessFile('src/index.js', '*', '*.test.js')).toBe(true);
      expect(shouldProcessFile('index.test.js', '*', '*.test.js')).toBe(false);
    });
  });

  describe('matchesPattern', () => {
    test('should match exact strings', () => {
      expect(matchesPattern('file.js', 'file.js')).toBe(true);
      expect(matchesPattern('file.js', 'other.js')).toBe(false);
    });

    test('should match wildcard patterns', () => {
      expect(matchesPattern('file.js', '*.js')).toBe(true);
      expect(matchesPattern('src/file.js', 'src/*')).toBe(true);
      expect(matchesPattern('src/nested/file.js', 'src/*')).toBe(false);
      expect(matchesPattern('src/nested/file.js', 'src/**')).toBe(true);
    });
  });
});