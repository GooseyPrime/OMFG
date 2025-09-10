# OMFG - Oh My Forking Git 🚀

[![CI](https://github.com/GooseyPrime/OMFG/actions/workflows/ci.yml/badge.svg)](https://github.com/GooseyPrime/OMFG/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A minimal, robust, and intuitive GitHub Action that fully syncs forked repositories with upstream, including code, workflows, and secrets. OMFG prioritizes security, auditability, and seamless user experience.

## Features ✨

- 🔄 **Full Repository Sync**: Code, workflows, and secrets
- 🔍 **Dry-Run Mode**: Preview changes before applying
- ⚡ **Smart Conflict Handling**: Multiple resolution strategies
- 🎯 **Fine-Grained Controls**: Include/exclude patterns
- 🛡️ **Security First**: Secure token handling and validation
- 📊 **Comprehensive Reporting**: Detailed change summaries
- 🔐 **Approval Workflows**: Optional manual approval process
- 🚀 **Zero Configuration**: Smart defaults with auto-detection

## Quick Start 🚀

### Basic Usage

```yaml
name: Sync Fork
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Sync with upstream
        uses: GooseyPrime/OMFG@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

```yaml
- name: Advanced sync
  uses: GooseyPrime/OMFG@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    upstream-repo: 'original-owner/repo-name'  # Auto-detected if not specified
    dry-run: false
    sync-code: true
    sync-workflows: true
    sync-secrets: false
    conflict-strategy: 'merge'  # merge, rebase, or fail
    include-patterns: 'src/**,docs/**'
    exclude-patterns: 'tests/**,*.tmp'
    require-approval: false
```

## Input Parameters 📝

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `github-token` | GitHub token with repo permissions | ✅ | `${{ github.token }}` |
| `upstream-repo` | Upstream repository (owner/repo) | ❌ | Auto-detected from fork |
| `dry-run` | Preview changes without applying | ❌ | `false` |
| `sync-code` | Sync code changes | ❌ | `true` |
| `sync-workflows` | Sync GitHub Actions workflows | ❌ | `true` |
| `sync-secrets` | Sync repository secrets | ❌ | `false` |
| `conflict-strategy` | How to handle conflicts | ❌ | `merge` |
| `include-patterns` | Files to include (glob patterns) | ❌ | `*` |
| `exclude-patterns` | Files to exclude (glob patterns) | ❌ | `''` |
| `require-approval` | Create PR for manual approval | ❌ | `false` |

## Outputs 📤

| Output | Description |
|--------|-------------|
| `changes-summary` | Detailed summary of all changes |
| `sync-status` | Status: success, conflicts, or failed |
| `conflicts-detected` | Comma-separated list of conflicted files |
| `files-changed` | Number of files that were modified |

## Conflict Resolution Strategies 🔧

### Merge (Default)
- Creates merge commits
- Preserves history from both branches
- Safe for most scenarios

### Rebase
- Creates linear history
- Replays local commits on top of upstream
- Cleaner git history but rewrites commits

### Fail
- Stops on first conflict
- Requires manual intervention
- Most conservative approach

## Security Considerations 🛡️

- **Token Permissions**: Requires `repo` scope for private repositories
- **Secret Sync**: Limited by GitHub API (can only list names, not values)
- **Approval Mode**: Creates pull requests for sensitive changes
- **Audit Trail**: Comprehensive logging of all operations

## Examples 📚

### Daily Automatic Sync

```yaml
name: Daily Sync
on:
  schedule:
    - cron: '0 6 * * *'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: GooseyPrime/OMFG@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Sync with Approval

```yaml
- uses: GooseyPrime/OMFG@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    require-approval: true
    conflict-strategy: 'fail'
```

### Workflow-Only Sync

```yaml
- uses: GooseyPrime/OMFG@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    sync-code: false
    sync-workflows: true
    sync-secrets: false
```

### Custom Patterns

```yaml
- uses: GooseyPrime/OMFG@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    include-patterns: 'src/**,docs/**,*.md'
    exclude-patterns: 'src/tests/**,*.log'
```

## Troubleshooting 🔍

### Common Issues

**Conflicts detected**
- Review conflicted files in the action logs
- Use `conflict-strategy: 'fail'` to stop on conflicts
- Enable `require-approval: true` for manual review

**Permission denied**
- Ensure token has `repo` scope
- For organization repos, may need admin permissions
- Secret sync requires admin access

**Auto-detection failed**
- Manually specify `upstream-repo` parameter
- Ensure repository is actually a fork

### Debug Mode

Enable debug logging by setting repository secret `ACTIONS_STEP_DEBUG` to `true`.

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm test` and `npm run lint`
6. Submit a pull request

## Development 🛠️

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Build for distribution
npm run build
```

## License 📄

MIT License - see [LICENSE](LICENSE) file for details.

## Support 💬

- 📋 [Create an issue](https://github.com/GooseyPrime/OMFG/issues)
- 🔧 [Request a feature](https://github.com/GooseyPrime/OMFG/issues)
- 📖 [Read the docs](https://github.com/GooseyPrime/OMFG#readme)

---

**OMFG** - Because managing forks shouldn't be a nightmare! 🎯
