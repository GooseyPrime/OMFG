/**
 * OMFG Fork Synchronization Logic
 * 
 * This module contains the core logic for synchronizing forks with their upstream repositories.
 */

const yaml = require('js-yaml');

/**
 * Load OMFG configuration from a repository's .omfg.yml file
 * @param {Object} context - Probot context object
 * @returns {Object|null} Configuration object or null if not found
 */
async function loadConfig(context) {
  try {
    const { data } = await context.octokit.repos.getContent({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      path: '.omfg.yml'
    });

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return yaml.load(content);
  } catch (error) {
    if (error.status === 404) {
      // File not found is not an error, just means no config
      return null;
    }
    throw new Error(`Failed to load .omfg.yml: ${error.message}`);
  }
}

/**
 * Validate OMFG configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with 'valid' boolean and 'errors' array
 */
function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  // Check required fields
  if (typeof config.auto_sync !== 'boolean') {
    errors.push('auto_sync must be a boolean');
  }

  if (!config.upstream || typeof config.upstream !== 'string') {
    errors.push('upstream must be a string in format "owner/repo"');
  } else if (!config.upstream.includes('/')) {
    errors.push('upstream must be in format "owner/repo"');
  }

  // Check optional fields
  if (config.branches && !Array.isArray(config.branches)) {
    errors.push('branches must be an array');
  }

  if (config.create_pr !== undefined && typeof config.create_pr !== 'boolean') {
    errors.push('create_pr must be a boolean');
  }

  if (config.pr_title !== undefined && typeof config.pr_title !== 'string') {
    errors.push('pr_title must be a string');
  }

  if (config.pr_body !== undefined && typeof config.pr_body !== 'string') {
    errors.push('pr_body must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a fork is behind its upstream repository
 * @param {Object} context - Probot context object
 * @param {Object} config - OMFG configuration
 * @returns {Object} Comparison result with behind count and ahead count
 */
async function compareForkWithUpstream(context, config) {
  const [upstreamOwner, upstreamRepo] = config.upstream.split('/');
  const forkOwner = context.payload.repository.owner.login;

  try {
    // Get the default branch from upstream
    const { data: upstreamRepoData } = await context.octokit.repos.get({
      owner: upstreamOwner,
      repo: upstreamRepo
    });

    const baseBranch = upstreamRepoData.default_branch;

    // Compare fork with upstream
    const { data: comparison } = await context.octokit.repos.compareCommitsWithBasehead({
      owner: upstreamOwner,
      repo: upstreamRepo,
      basehead: `${forkOwner}:${baseBranch}...${upstreamOwner}:${baseBranch}`
    });

    return {
      behind_by: comparison.behind_by,
      ahead_by: comparison.ahead_by,
      status: comparison.status,
      commits: comparison.commits,
      base_branch: baseBranch
    };
  } catch (error) {
    throw new Error(`Failed to compare fork with upstream: ${error.message}`);
  }
}

/**
 * Synchronize a fork with its upstream repository
 * @param {Object} context - Probot context object
 * @param {Object} config - OMFG configuration
 */
async function syncFork(context, config) {
  const logger = context.log;
  const { repository } = context.payload;
  
  logger.info(`Starting sync process for ${repository.full_name}`);

  try {
    // Compare fork with upstream
    const comparison = await compareForkWithUpstream(context, config);
    
    if (comparison.behind_by === 0) {
      logger.info(`Fork ${repository.full_name} is up to date with upstream`);
      return { success: true, message: 'Fork is already up to date' };
    }

    logger.info(`Fork ${repository.full_name} is ${comparison.behind_by} commits behind upstream`);

    // Determine sync method based on configuration
    const shouldCreatePR = config.create_pr !== false; // Default to PR creation

    if (shouldCreatePR) {
      await createSyncPullRequest(context, config, comparison);
    } else {
      await performDirectSync(context, config, comparison);
    }

    return { 
      success: true, 
      message: `Successfully synced ${comparison.behind_by} commits from upstream`,
      commits_synced: comparison.behind_by
    };

  } catch (error) {
    logger.error(`Failed to sync fork ${repository.full_name}:`, error);
    throw error;
  }
}

/**
 * Create a pull request to sync fork with upstream
 * @param {Object} context - Probot context object
 * @param {Object} config - OMFG configuration
 * @param {Object} comparison - Comparison result from compareForkWithUpstream
 */
async function createSyncPullRequest(context, config, comparison) {
  const [upstreamOwner, upstreamRepo] = config.upstream.split('/');
  const { repository } = context.payload;
  const logger = context.log;

  const prTitle = config.pr_title || '🔄 Auto-sync with upstream';
  const prBody = (config.pr_body || `This PR automatically syncs changes from the upstream repository.

**Upstream:** {upstream}
**Branch:** {branch}
**Commits behind:** {commits_behind}

## Changes included:
{commit_list}`).replace('{upstream}', config.upstream)
    .replace('{branch}', comparison.base_branch)
    .replace('{commits_behind}', comparison.behind_by)
    .replace('{commit_list}', comparison.commits.map(commit => 
      `- ${commit.sha.substring(0, 7)}: ${commit.commit.message.split('\n')[0]}`
    ).join('\n'));

  try {
    // First, we need to create a branch for the sync
    const syncBranchName = `omfg-sync-${Date.now()}`;

    // Get the upstream branch reference
    const { data: upstreamRef } = await context.octokit.git.getRef({
      owner: upstreamOwner,
      repo: upstreamRepo,
      ref: `heads/${comparison.base_branch}`
    });

    // Create a new branch in the fork pointing to upstream's latest commit
    await context.octokit.git.createRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: `refs/heads/${syncBranchName}`,
      sha: upstreamRef.object.sha
    });

    // Create the pull request
    const { data: pr } = await context.octokit.pulls.create({
      owner: repository.owner.login,
      repo: repository.name,
      title: prTitle,
      body: prBody,
      head: syncBranchName,
      base: comparison.base_branch
    });

    logger.info(`Created sync PR #${pr.number} in ${repository.full_name}`);
    return pr;

  } catch (error) {
    throw new Error(`Failed to create sync pull request: ${error.message}`);
  }
}

/**
 * Perform direct synchronization without creating a PR
 * @param {Object} context - Probot context object
 * @param {Object} config - OMFG configuration
 * @param {Object} comparison - Comparison result from compareForkWithUpstream
 */
async function performDirectSync(context, config, comparison) {
  const [upstreamOwner, upstreamRepo] = config.upstream.split('/');
  const { repository } = context.payload;
  const logger = context.log;

  try {
    // Get the upstream branch reference
    const { data: upstreamRef } = await context.octokit.git.getRef({
      owner: upstreamOwner,
      repo: upstreamRepo,
      ref: `heads/${comparison.base_branch}`
    });

    // Update the fork's branch to point to upstream's latest commit
    await context.octokit.git.updateRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: `heads/${comparison.base_branch}`,
      sha: upstreamRef.object.sha
    });

    logger.info(`Directly synced ${repository.full_name} with upstream`);

  } catch (error) {
    throw new Error(`Failed to perform direct sync: ${error.message}`);
  }
}

module.exports = {
  loadConfig,
  validateConfig,
  compareForkWithUpstream,
  syncFork,
  createSyncPullRequest,
  performDirectSync
};