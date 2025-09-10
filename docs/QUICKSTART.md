# OMFG Quick Start Guide 🚀

Get your forked repository syncing with upstream in under 5 minutes!

## Step 1: Copy the Workflow File

1. In your forked repository, create the directory `.github/workflows/` if it doesn't exist
2. Copy the example workflow from [example-sync-fork.yml](../.github/workflows/example-sync-fork.yml)
3. Save it as `.github/workflows/sync-fork.yml` in your repository

## Step 2: Customize (Optional)

The workflow works out of the box, but you can customize:

```yaml
- name: Sync with upstream
  uses: GooseyPrime/OMFG@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    # Add your customizations here:
    # upstream-repo: 'original-owner/repo-name'  # Usually auto-detected
    # dry-run: false
    # sync-workflows: true
    # conflict-strategy: 'merge'
```

## Step 3: Test the Action

### Manual Test
1. Go to the "Actions" tab in your repository
2. Click "Sync Fork with Upstream" in the left sidebar
3. Click "Run workflow" → "Run workflow"
4. Watch it run!

### Test in Dry-Run Mode
1. Click "Run workflow"
2. Check "Run in dry-run mode"
3. Click "Run workflow"
4. Review what would be changed without applying changes

## Step 4: Enable Automatic Syncing

The workflow runs daily at 6 AM UTC by default. You can change this by modifying the cron schedule:

```yaml
on:
  schedule:
    - cron: '0 18 * * *'  # 6 PM UTC instead
```

## Common Customizations

### Sync Only Code (No Workflows)
```yaml
sync-code: true
sync-workflows: false
sync-secrets: false
```

### Require Manual Approval
```yaml
require-approval: true
conflict-strategy: 'fail'
```

### Custom File Patterns
```yaml
include-patterns: 'src/**,docs/**,*.md'
exclude-patterns: 'tests/**,*.log,node_modules/**'
```

## Troubleshooting

### "Could not auto-detect upstream repository"
Add the `upstream-repo` parameter:
```yaml
upstream-repo: 'original-owner/original-repo-name'
```

### "Permission denied"
Make sure your repository has the default `GITHUB_TOKEN` permissions enabled in Settings → Actions → General.

### Viewing Sync Results
Check the "Summary" tab of any workflow run to see:
- Files changed
- Conflict details
- Complete change summary

## Need Help?

- 📋 [Create an issue](https://github.com/GooseyPrime/OMFG/issues)
- 📖 [Read the full documentation](../README.md)
- 🔧 [View example configurations](../README.md#examples)

Happy syncing! 🎉