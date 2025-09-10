# OMFG Documentation

## Overview

OMFG (Oh My Forking Git) is a GitHub Action designed to keep forked repositories in sync with their upstream counterparts. It provides a comprehensive solution for syncing code, workflows, and even repository secrets.

## Configuration Guide

### Basic Setup

The minimal configuration requires only a GitHub token:

```yaml
- uses: GooseyPrime/OMFG@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

For more control over the sync process:

```yaml
- uses: GooseyPrime/OMFG@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    upstream-repo: 'original-owner/repo-name'
    dry-run: false
    sync-code: true
    sync-workflows: true
    sync-secrets: false
    conflict-strategy: 'merge'
    include-patterns: 'src/**,docs/**'
    exclude-patterns: 'tests/**,*.tmp'
    require-approval: false
```

## Sync Types

### Code Synchronization

Synchronizes the main branch code from upstream to your fork. Supports multiple conflict resolution strategies:

- **Merge**: Creates merge commits (default)
- **Rebase**: Creates linear history
- **Fail**: Stops on conflicts

### Workflow Synchronization

Copies GitHub Actions workflow files from the upstream repository's `.github/workflows` directory to your fork. This ensures your fork has the same CI/CD pipeline as the upstream project.

### Secret Synchronization

**Note**: Due to GitHub API limitations, secrets cannot be read programmatically for security reasons. OMFG can only:
- List secret names that exist in the upstream repository
- Compare with your repository's secret names
- Report which secrets need to be manually synchronized

## Pattern Matching

OMFG supports glob patterns for fine-grained control over which files to sync:

### Include Patterns
- `*` - All files (default)
- `*.js` - All JavaScript files
- `src/**` - All files in src directory and subdirectories
- `docs/*.md` - Markdown files in docs directory

### Exclude Patterns
- `node_modules/**` - Exclude all node_modules
- `*.test.js` - Exclude test files
- `tmp/**,*.log` - Exclude multiple patterns

## Security Features

### Token Requirements

| Operation | Required Permissions |
|-----------|---------------------|
| Code sync | `repo` (read/write) |
| Workflow sync | `repo` (read/write) |
| Secret listing | `repo` (read) |
| Secret creation | `admin` or `maintain` |

### Audit Trail

OMFG provides comprehensive logging:
- All operations are logged with timestamps
- File changes are tracked and reported
- Conflicts are clearly identified
- Summary reports show exactly what changed

### Approval Workflow

When `require-approval` is enabled:
1. OMFG creates a new branch with synced changes
2. A pull request is created for review
3. Changes can be reviewed before merging
4. Provides an additional safety layer

## Troubleshooting

### Common Issues

**"Could not auto-detect upstream repository"**
- Ensure your repository is actually a fork
- Or manually specify the `upstream-repo` parameter

**"Permission denied"**
- Check that your token has sufficient permissions
- For organization repositories, you may need admin access

**"Conflicts detected"**
- Review the conflicted files listed in the output
- Consider using `conflict-strategy: 'fail'` to stop on conflicts
- Use `require-approval: true` for manual review

**"No changes detected"**
- Your fork might already be up to date
- Check the upstream repository for recent changes
- Verify include/exclude patterns aren't too restrictive

### Debug Mode

Enable detailed logging by setting the repository secret `ACTIONS_STEP_DEBUG` to `true`.

## Best Practices

### Scheduling

```yaml
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:     # Allow manual triggers
```

### Error Handling

```yaml
- uses: GooseyPrime/OMFG@v1
  id: sync
  continue-on-error: true
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    
- name: Handle sync failure
  if: steps.sync.outcome == 'failure'
  run: |
    echo "Sync failed. Check the logs for details."
    echo "Status: ${{ steps.sync.outputs.sync-status }}"
    echo "Conflicts: ${{ steps.sync.outputs.conflicts-detected }}"
```

### Notifications

```yaml
- name: Notify on conflicts
  if: steps.sync.outputs.sync-status == 'conflicts'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Sync conflicts detected',
        body: `Conflicts in: ${{ steps.sync.outputs.conflicts-detected }}`
      })
```

## API Reference

### Inputs

See the main README for a complete list of input parameters.

### Outputs

All outputs are strings that can be used in subsequent workflow steps:

```yaml
- name: Use sync outputs
  run: |
    echo "Files changed: ${{ steps.sync.outputs.files-changed }}"
    echo "Status: ${{ steps.sync.outputs.sync-status }}"
    if [ "${{ steps.sync.outputs.conflicts-detected }}" != "" ]; then
      echo "Conflicts: ${{ steps.sync.outputs.conflicts-detected }}"
    fi
```

## Contributing

See the main README for contribution guidelines.