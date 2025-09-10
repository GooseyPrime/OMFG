const core = require('@actions/core');

/**
 * Validate action inputs
 */
async function validateInputs(inputs) {
  // Validate conflict strategy
  const validStrategies = ['merge', 'rebase', 'fail'];
  if (!validStrategies.includes(inputs.conflictStrategy)) {
    throw new Error(`Invalid conflict-strategy: ${inputs.conflictStrategy}. Must be one of: ${validStrategies.join(', ')}`);
  }

  // Validate upstream repo format if provided
  if (inputs.upstreamRepo) {
    const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!repoPattern.test(inputs.upstreamRepo)) {
      throw new Error(`Invalid upstream-repo format: ${inputs.upstreamRepo}. Must be in format: owner/repo`);
    }
  }

  // Validate that at least one sync option is enabled
  if (!inputs.syncCode && !inputs.syncWorkflows && !inputs.syncSecrets) {
    throw new Error('At least one sync option must be enabled (sync-code, sync-workflows, or sync-secrets)');
  }

  core.info('✅ Input validation passed');
}

/**
 * Summarize sync changes
 */
function summarizeChanges(syncResult) {
  const lines = [];
  
  lines.push(`**Sync Status:** ${syncResult.status.toUpperCase()}`);
  lines.push(`**Files Changed:** ${syncResult.filesChanged}`);
  
  if (syncResult.conflicts.length > 0) {
    lines.push(`**Conflicts:** ${syncResult.conflicts.length}`);
    syncResult.conflicts.forEach(conflict => {
      lines.push(`  - ${conflict}`);
    });
  }

  if (syncResult.changes.length > 0) {
    lines.push('**Changes:**');
    
    const changesByType = groupBy(syncResult.changes, 'type');
    
    Object.keys(changesByType).forEach(type => {
      const typeChanges = changesByType[type];
      lines.push(`  **${type.toUpperCase()}:**`);
      
      typeChanges.forEach(change => {
        if (change.file) {
          lines.push(`    - ${change.action}: ${change.file}`);
          if (change.insertions !== undefined || change.deletions !== undefined) {
            lines.push(`      (+${change.insertions || 0}/-${change.deletions || 0})`);
          }
        } else if (change.secrets) {
          lines.push(`    - ${change.action}: ${change.secrets.join(', ')}`);
        }
      });
    });
  }

  if (syncResult.error) {
    lines.push(`**Error:** ${syncResult.error}`);
  }

  return lines.join('\n');
}

/**
 * Group array of objects by a property
 */
function groupBy(array, property) {
  return array.reduce((groups, item) => {
    const key = item[property];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Log an action with timestamp and emoji
 */
function logAction(emoji, message) {
  core.info(`${emoji} [${getTimestamp()}] ${message}`);
}

/**
 * Validate GitHub token permissions
 */
async function validateTokenPermissions(octokit, context) {
  try {
    // Check if we can access the repository
    await octokit.rest.repos.get({
      owner: context.repo.owner,
      repo: context.repo.repo
    });

    // For now, we'll do basic validation
    // More sophisticated permission checking could be added here
    core.info('✅ GitHub token has basic repository access');
    
  } catch (error) {
    throw new Error(`GitHub token validation failed: ${error.message}`);
  }
}

/**
 * Create a safe branch name
 */
function createSafeBranchName(prefix = 'omfg-sync') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').split('.')[0];
  return `${prefix}-${timestamp}`;
}

/**
 * Parse glob patterns
 */
function parsePatterns(patternString) {
  if (!patternString) return [];
  
  return patternString
    .split(',')
    .map(pattern => pattern.trim())
    .filter(pattern => pattern.length > 0);
}

/**
 * Check if a file should be processed based on include/exclude patterns
 */
function shouldProcessFile(filePath, includePatterns, excludePatterns) {
  const includes = parsePatterns(includePatterns);
  const excludes = parsePatterns(excludePatterns);

  // Check exclude patterns first
  if (excludes.length > 0) {
    for (const pattern of excludes) {
      if (matchesPattern(filePath, pattern)) {
        return false;
      }
    }
  }

  // Check include patterns
  if (includes.length === 0 || includes.includes('*')) {
    return true;
  }

  for (const pattern of includes) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Simple pattern matching (supports * wildcard)
 * * matches any characters except /
 * ** matches any characters including /
 */
function matchesPattern(text, pattern) {
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*\*/g, '__DOUBLE_STAR__') // Temporarily replace **
    .replace(/\*/g, '[^/]*') // Convert * to match any char except /
    .replace(/__DOUBLE_STAR__/g, '.*'); // Convert ** to match any char including /
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
}

/**
 * Generate a comprehensive sync report
 */
function generateSyncReport(syncResult, options = {}) {
  const report = {
    timestamp: getTimestamp(),
    status: syncResult.status,
    summary: {
      filesChanged: syncResult.filesChanged,
      conflictsCount: syncResult.conflicts.length,
      changesCount: syncResult.changes.length
    },
    details: {
      conflicts: syncResult.conflicts,
      changes: syncResult.changes,
      error: syncResult.error
    },
    options: {
      dryRun: options.dryRun,
      syncCode: options.syncCode,
      syncWorkflows: options.syncWorkflows,
      syncSecrets: options.syncSecrets,
      conflictStrategy: options.conflictStrategy
    }
  };

  return report;
}

module.exports = {
  validateInputs,
  summarizeChanges,
  groupBy,
  formatFileSize,
  getTimestamp,
  logAction,
  validateTokenPermissions,
  createSafeBranchName,
  parsePatterns,
  shouldProcessFile,
  matchesPattern,
  generateSyncReport
};