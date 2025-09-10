# OMFG (Oh My Forking Git)

A GitHub App for automated fork monitoring and synchronization as a service. Keep your forks in sync with upstream repositories effortlessly! 🚀

## Features

- 🔄 **Automated Sync**: Automatically synchronize your forks with upstream repositories
- 🎯 **Smart Detection**: Monitors push events and fork creation to trigger sync operations
- ⚙️ **Configurable**: Simple YAML configuration per repository
- 🔀 **Flexible Sync Methods**: Choose between pull requests or direct pushes
- 📊 **Comprehensive Logging**: Detailed logging and error handling
- 🛡️ **Secure**: Built with GitHub App security best practices

## Installation

### As a GitHub App

1. **Install the App**: Visit the [OMFG GitHub App page](#) and click "Install"
2. **Choose Repositories**: Select which repositories you want OMFG to monitor
3. **Configure Repositories**: Add a `.omfg.yml` configuration file to each repository you want to sync

### Required Permissions

The OMFG GitHub App requires the following permissions:

- **Repository permissions**:
  - Contents: Read & Write (to read config and sync files)
  - Pull requests: Read & Write (to create sync PRs)
  - Issues: Write (to create welcome issues in new forks)
  - Metadata: Read (to access repository information)

- **Organization permissions**:
  - Members: Read (to check organization membership)

- **Events**:
  - Push
  - Pull request
  - Fork
  - Installation
  - Installation repositories

## Configuration

Create a `.omfg.yml` file in the root of your repository:

```yaml
# Whether to automatically sync the fork with upstream
auto_sync: true

# The upstream repository to sync from (format: owner/repo)
upstream: GooseyPrime/OMFG

# Optional: Branches to sync (default: ['main', 'master'])
branches:
  - main
  - develop

# Optional: Whether to create pull requests instead of direct pushes (default: true)
create_pr: true

# Optional: PR title template for auto-sync PRs
pr_title: "🔄 Auto-sync with upstream"

# Optional: PR body template for auto-sync PRs
pr_body: |
  This PR automatically syncs changes from the upstream repository.
  
  Upstream: {upstream}
  Branch: {branch}
```

### Configuration Reference

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `auto_sync` | boolean | ✅ | - | Enable/disable automatic synchronization |
| `upstream` | string | ✅ | - | Upstream repository in `owner/repo` format |
| `branches` | array | ❌ | `['main', 'master']` | Branches to monitor and sync |
| `create_pr` | boolean | ❌ | `true` | Create pull requests instead of direct pushes |
| `pr_title` | string | ❌ | `"🔄 Auto-sync with upstream"` | Template for PR titles |
| `pr_body` | string | ❌ | Default template | Template for PR descriptions |

### Template Variables

In `pr_title` and `pr_body`, you can use these variables:

- `{upstream}`: The upstream repository name
- `{branch}`: The branch being synced
- `{commits_behind}`: Number of commits behind upstream
- `{commit_list}`: List of commits being synced

## How It Works

1. **Detection**: OMFG monitors your repositories for push events and fork creation
2. **Configuration**: Reads `.omfg.yml` from your repository root
3. **Comparison**: Compares your fork with the configured upstream repository
4. **Synchronization**: Creates a pull request or directly pushes changes based on your configuration
5. **Notification**: Logs all activities and provides detailed information about sync operations

## Development

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/GooseyPrime/OMFG.git
cd OMFG

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

#### Configuration Not Found
**Problem**: OMFG is not syncing my fork  
**Solution**: Ensure you have a `.omfg.yml` file in your repository root with valid configuration

#### Permission Denied
**Problem**: OMFG cannot create pull requests or push changes  
**Solution**: Check that the app has the required permissions and that your repository allows the app

#### Upstream Repository Not Found
**Problem**: Error messages about upstream repository  
**Solution**: Verify that the `upstream` field in your configuration points to a valid, accessible repository

#### Sync Conflicts
**Problem**: Automatic sync fails due to conflicts  
**Solution**: OMFG will create a pull request instead of direct push when conflicts are detected. Resolve conflicts manually in the PR.

### FAQ

**Q: Can I use OMFG with private repositories?**  
A: Yes, OMFG works with both public and private repositories, as long as it has the necessary permissions.

**Q: What happens if my fork has uncommitted changes?**  
A: OMFG will create a pull request instead of direct push to preserve your changes and allow manual review.

**Q: Can I sync multiple upstream repositories?**  
A: Currently, OMFG supports one upstream repository per fork. For multiple upstreams, consider using separate configurations in different branches.

**Q: How often does OMFG check for updates?**  
A: OMFG responds to GitHub events in real-time. It checks for updates when pushes occur to the upstream repository.

**Q: Can I customize the sync behavior?**  
A: Yes! Use the configuration options in `.omfg.yml` to customize PR titles, descriptions, and sync behavior.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/GooseyPrime/OMFG)
- 🐛 [Report Issues](https://github.com/GooseyPrime/OMFG/issues)
- 💬 [Discussions](https://github.com/GooseyPrime/OMFG/discussions)

---

Made with ❤️ by [GooseyPrime](https://github.com/GooseyPrime)
# This trigger CI
