const core = require('@actions/core');
const io = require('@actions/io');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;

async function sync(options) {
  const {
    upstreamRepo,
    dryRun,
    syncCode,
    syncWorkflows,
    syncSecrets,
    conflictStrategy,
    includePatterns,
    excludePatterns,
    requireApproval,
    context,
    octokit
  } = options;

  const result = {
    status: 'success',
    filesChanged: 0,
    conflicts: [],
    changes: [],
    error: null
  };

  try {
    const git = simpleGit(process.cwd());
    
    // Configure git
    await git.addConfig('user.name', 'OMFG Action');
    await git.addConfig('user.email', 'action@github.com');

    // Add upstream remote if it doesn't exist
    try {
      await git.addRemote('upstream', `https://github.com/${upstreamRepo}.git`);
    } catch (error) {
      // Remote might already exist
      if (!error.message.includes('remote upstream already exists')) {
        throw error;
      }
    }

    // Fetch from upstream
    core.info('📡 Fetching from upstream repository...');
    await git.fetch('upstream');

    const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
    core.info(`🌿 Current branch: ${currentBranch}`);

    if (syncCode) {
      core.info('🔄 Syncing code changes...');
      const codeResult = await syncCodeChanges(git, currentBranch, conflictStrategy, dryRun);
      result.filesChanged += codeResult.filesChanged;
      result.conflicts.push(...codeResult.conflicts);
      result.changes.push(...codeResult.changes);
      
      if (codeResult.status !== 'success') {
        result.status = codeResult.status;
      }
    }

    if (syncWorkflows) {
      core.info('⚙️ Syncing workflow files...');
      const workflowResult = await syncWorkflowFiles(git, upstreamRepo, octokit, dryRun, includePatterns, excludePatterns);
      result.filesChanged += workflowResult.filesChanged;
      result.changes.push(...workflowResult.changes);
    }

    if (syncSecrets) {
      core.info('🔐 Syncing repository secrets...');
      const secretsResult = await syncRepositorySecrets(upstreamRepo, context, octokit, dryRun);
      result.changes.push(...secretsResult.changes);
    }

    if (requireApproval && !dryRun && result.filesChanged > 0) {
      core.info('⏸️ Approval required - creating pull request for review...');
      await createApprovalPullRequest(context, octokit, result);
    }

  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    core.error(`Sync failed: ${error.message}`);
  }

  return result;
}

async function syncCodeChanges(git, currentBranch, conflictStrategy, dryRun) {
  const result = {
    status: 'success',
    filesChanged: 0,
    conflicts: [],
    changes: []
  };

  try {
    // Check if we're behind upstream
    const status = await git.status();
    core.info(`📊 Repository status: ${status.behind} commits behind, ${status.ahead} commits ahead`);

    if (dryRun) {
      // Show what would be merged
      const diffSummary = await git.diffSummary(['HEAD', `upstream/${currentBranch}`]);
      result.filesChanged = diffSummary.files.length;
      result.changes = diffSummary.files.map(file => ({
        type: 'code',
        action: file.binary ? 'binary-change' : 'modified',
        file: file.file,
        insertions: file.insertions,
        deletions: file.deletions
      }));
      
      core.info(`📋 Dry-run: Would sync ${result.filesChanged} files`);
      return result;
    }

    // Perform the merge/rebase based on strategy
    if (conflictStrategy === 'rebase') {
      core.info('🔄 Rebasing against upstream...');
      await git.rebase([`upstream/${currentBranch}`]);
    } else {
      core.info('🔄 Merging from upstream...');
      await git.merge([`upstream/${currentBranch}`]);
    }

    // Check for conflicts
    const statusAfter = await git.status();
    if (statusAfter.conflicted.length > 0) {
      result.status = 'conflicts';
      result.conflicts = statusAfter.conflicted;
      core.warning(`⚠️ Conflicts detected in files: ${statusAfter.conflicted.join(', ')}`);
    } else {
      // Get the actual changes that were applied
      const diffSummary = await git.diffSummary(['HEAD~1', 'HEAD']);
      result.filesChanged = diffSummary.files.length;
      result.changes = diffSummary.files.map(file => ({
        type: 'code',
        action: 'synced',
        file: file.file,
        insertions: file.insertions,
        deletions: file.deletions
      }));
    }

  } catch (error) {
    if (error.message.includes('CONFLICT')) {
      result.status = 'conflicts';
      // Extract conflict files from error message
      const conflictMatches = error.message.match(/CONFLICT.*in (.+)/g);
      if (conflictMatches) {
        result.conflicts = conflictMatches.map(match => 
          match.replace(/CONFLICT.*in /, '').trim()
        );
      }
    } else {
      throw error;
    }
  }

  return result;
}

async function syncWorkflowFiles(git, upstreamRepo, octokit, dryRun, includePatterns, excludePatterns) {
  const result = {
    filesChanged: 0,
    changes: []
  };

  try {
    // Get workflow files from upstream
    const { data: upstreamWorkflows } = await octokit.rest.repos.getContent({
      owner: upstreamRepo.split('/')[0],
      repo: upstreamRepo.split('/')[1],
      path: '.github/workflows'
    });

    if (!Array.isArray(upstreamWorkflows)) {
      return result; // No workflows directory
    }

    for (const workflow of upstreamWorkflows) {
      if (workflow.type !== 'file' || !workflow.name.match(/\.(yml|yaml)$/)) {
        continue;
      }

      // Check include/exclude patterns
      if (!shouldIncludeFile(workflow.name, includePatterns, excludePatterns)) {
        continue;
      }

      const localPath = path.join('.github/workflows', workflow.name);
      
      if (dryRun) {
        result.changes.push({
          type: 'workflow',
          action: 'would-sync',
          file: localPath
        });
        result.filesChanged++;
        continue;
      }

      // Download and save the workflow file
      const { data: fileContent } = await octokit.rest.repos.getContent({
        owner: upstreamRepo.split('/')[0],
        repo: upstreamRepo.split('/')[1],
        path: workflow.path
      });

      const content = Buffer.from(fileContent.content, 'base64').toString();
      await io.mkdirP(path.dirname(localPath));
      await fs.writeFile(localPath, content);

      result.changes.push({
        type: 'workflow',
        action: 'synced',
        file: localPath
      });
      result.filesChanged++;

      core.info(`📄 Synced workflow: ${workflow.name}`);
    }

  } catch (error) {
    core.warning(`⚠️ Could not sync workflows: ${error.message}`);
  }

  return result;
}

async function syncRepositorySecrets(upstreamRepo, context, octokit, dryRun) {
  const result = {
    changes: []
  };

  try {
    // Note: GitHub API doesn't allow reading secret values, only names
    // This is a limitation for security reasons
    const { data: upstreamSecrets } = await octokit.rest.actions.listRepoSecrets({
      owner: upstreamRepo.split('/')[0],
      repo: upstreamRepo.split('/')[1]
    });

    const { data: currentSecrets } = await octokit.rest.actions.listRepoSecrets({
      owner: context.repo.owner,
      repo: context.repo.repo
    });

    const currentSecretNames = new Set(currentSecrets.secrets.map(s => s.name));
    const missingSecrets = upstreamSecrets.secrets.filter(s => 
      !currentSecretNames.has(s.name)
    );

    if (missingSecrets.length > 0) {
      result.changes.push({
        type: 'secrets',
        action: dryRun ? 'would-need-manual-sync' : 'needs-manual-sync',
        secrets: missingSecrets.map(s => s.name)
      });

      core.warning(`🔐 Found ${missingSecrets.length} secrets in upstream that need manual sync: ${missingSecrets.map(s => s.name).join(', ')}`);
      core.warning('ℹ️ Secret values cannot be read via API for security reasons. Please sync manually.');
    }

  } catch (error) {
    core.warning(`⚠️ Could not check repository secrets: ${error.message}`);
  }

  return result;
}

async function createApprovalPullRequest(context, octokit, syncResult) {
  const branchName = `omfg-sync-${Date.now()}`;
  const git = simpleGit(process.cwd());

  // Create a new branch
  await git.checkoutLocalBranch(branchName);

  // Create PR description
  const description = `## OMFG Sync Summary

This PR contains changes synced from upstream repository.

### Changes:
${syncResult.changes.map(change => 
    `- **${change.type}**: ${change.action} - ${change.file || change.secrets?.join(', ') || 'multiple files'}`
  ).join('\n')}

### Files Changed: ${syncResult.filesChanged}

${syncResult.conflicts.length > 0 ? 
    `### ⚠️ Conflicts Detected:
${syncResult.conflicts.map(file => `- ${file}`).join('\n')}

Please review and resolve conflicts before merging.` : 
    '### ✅ No conflicts detected'}

---
*Generated by OMFG (Oh My Forking Git) Action*`;

  // Push the branch
  await git.push('origin', branchName);

  // Create pull request
  const { data: pr } = await octokit.rest.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: `🔄 OMFG Sync: ${new Date().toISOString().split('T')[0]}`,
    head: branchName,
    base: context.ref.replace('refs/heads/', ''),
    body: description
  });

  core.info(`📝 Created pull request for approval: ${pr.html_url}`);
  return pr;
}

function shouldIncludeFile(filename, includePatterns, excludePatterns) {
  const includes = includePatterns.split(',').map(p => p.trim()).filter(p => p);
  const excludes = excludePatterns.split(',').map(p => p.trim()).filter(p => p);

  // Check exclude patterns first
  if (excludes.length > 0) {
    for (const pattern of excludes) {
      if (filename.includes(pattern) || filename.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
        return false;
      }
    }
  }

  // Check include patterns
  if (includes.length === 0 || includes.includes('*')) {
    return true;
  }

  for (const pattern of includes) {
    if (filename.includes(pattern) || filename.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
      return true;
    }
  }

  return false;
}

module.exports = { sync };