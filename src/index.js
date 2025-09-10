const core = require('@actions/core');
const github = require('@actions/github');
const { sync } = require('./sync');
const { validateInputs, summarizeChanges } = require('./utils');

async function run() {
  try {
    // Get inputs
    const inputs = {
      githubToken: core.getInput('github-token', { required: true }),
      upstreamRepo: core.getInput('upstream-repo'),
      dryRun: core.getBooleanInput('dry-run'),
      syncCode: core.getBooleanInput('sync-code'),
      syncWorkflows: core.getBooleanInput('sync-workflows'),
      syncSecrets: core.getBooleanInput('sync-secrets'),
      conflictStrategy: core.getInput('conflict-strategy'),
      includePatterns: core.getInput('include-patterns'),
      excludePatterns: core.getInput('exclude-patterns'),
      requireApproval: core.getBooleanInput('require-approval')
    };

    // Validate inputs
    await validateInputs(inputs);

    // Get repository context
    const context = github.context;
    const octokit = github.getOctokit(inputs.githubToken);

    core.info('🚀 Starting OMFG sync process...');
    
    if (inputs.dryRun) {
      core.info('🔍 Running in dry-run mode - no changes will be applied');
    }

    // Determine upstream repository
    let upstreamRepo = inputs.upstreamRepo;
    if (!upstreamRepo) {
      // Try to auto-detect from fork relationship
      const { data: repo } = await octokit.rest.repos.get({
        owner: context.repo.owner,
        repo: context.repo.repo
      });
      
      if (repo.fork && repo.parent) {
        upstreamRepo = repo.parent.full_name;
        core.info(`📍 Auto-detected upstream repository: ${upstreamRepo}`);
      } else {
        throw new Error('Could not auto-detect upstream repository. Please specify upstream-repo input.');
      }
    }

    // Perform sync
    const syncResult = await sync({
      ...inputs,
      upstreamRepo,
      context,
      octokit
    });

    // Summarize changes
    const summary = summarizeChanges(syncResult);
    core.info(`📊 Sync Summary:\n${summary}`);

    // Set outputs
    core.setOutput('changes-summary', summary);
    core.setOutput('sync-status', syncResult.status);
    core.setOutput('conflicts-detected', syncResult.conflicts.join(','));
    core.setOutput('files-changed', syncResult.filesChanged.toString());

    if (syncResult.status === 'success') {
      core.info('✅ Sync completed successfully!');
    } else if (syncResult.status === 'conflicts') {
      core.warning('⚠️ Sync completed with conflicts that need manual resolution');
    } else {
      core.setFailed(`❌ Sync failed: ${syncResult.error}`);
    }

  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    core.debug(error.stack);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  run();
}

module.exports = { run };