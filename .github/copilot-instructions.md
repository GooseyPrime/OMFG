# OMFG (Oh My Forking Git) - GitHub App Development Instructions

OMFG is a Node.js GitHub App built with Probot that provides automated fork synchronization services. It monitors GitHub events and automatically syncs forks with their upstream repositories.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap, Build, and Test Commands
- Install dependencies: `npm install` -- takes ~5 seconds. NEVER CANCEL.
- Run linting: `npm run lint` -- takes ~0.5 seconds. Fast execution.
- Run tests: `npm test` -- takes ~1 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
- Check syntax: `node -c app/index.js && node -c app/syncFork.js && node -c server.js` -- instant validation.
- **CRITICAL**: Run `npm run lint` before committing or CI will fail.

### Known Issues and Workarounds
- **MISSING DEPENDENCY**: `npm run dev` fails with "nodemon: not found". Fix: `npm install --save-dev nodemon`
- **MISSING PUBLIC DIRECTORY**: `npm run start:landing` fails due to missing `public/index.html`. The landing page server expects a public directory that doesn't exist in the repository.
- **GitHub App Configuration**: Main app requires `APP_ID` and `PRIVATE_KEY` environment variables for full functionality. Without these, it runs in setup mode.

### Application Startup Commands
- **Main GitHub App**: `npm start` -- starts on port 3000. NEVER CANCEL. App starts immediately but requires GitHub App configuration.
- **Development Mode**: `npm run dev` -- requires nodemon installation first. Starts with auto-reload on port 3000.
- **Landing Page Server**: `npm run start:landing` -- starts on port 3001. Will fail without public directory.

### Testing and Coverage
- Run all tests: `npm test` -- 14 tests, all pass in ~1 second
- Watch mode: `npm run test:watch` -- starts Jest in watch mode
- Coverage report: `npm test -- --coverage` -- generates coverage but shows 0% due to Jest config pointing to non-existent `src/` directory
- **Security audit**: `npm audit --audit-level high` -- checks for vulnerabilities

## Validation Scenarios

### After Making Changes - ALWAYS Run These Steps
1. **Syntax Validation**: `node -c app/index.js && node -c app/syncFork.js && node -c server.js`
2. **Linting**: `npm run lint` -- must pass or CI fails
3. **Tests**: `npm test` -- all 14 tests must pass
4. **Startup Test**: Start app with `DISABLE_WEBHOOK_EVENT_CHECK=true npm start` and verify "Listening on http://localhost:3000" appears

### Manual Testing Scenarios
- **Health Check**: After starting app, curl `http://localhost:3000` should show Probot setup page
- **Landing Page**: If public directory exists, `http://localhost:3001/health` should return `{"status":"ok"}`
- **Configuration Loading**: Test with sample `.omfg.yml` file to verify config parsing

### CI Pipeline Validation
The CI pipeline (`.github/workflows/ci.yml`) runs:
1. `npm ci` -- clean install dependencies
2. `npm run lint` -- ESLint validation  
3. `npm test` -- Jest test suite
4. `node -c app/index.js && node -c app/syncFork.js` -- syntax validation
5. `npm audit --audit-level high` -- security audit

## Key Projects and File Structure

### Core Application Files
- `app/index.js` -- Main Probot app entry point, handles GitHub events
- `app/syncFork.js` -- Core fork synchronization logic and configuration handling
- `server.js` -- Express server for landing page (separate from main app)

### Configuration Files
- `package.json` -- Node.js project configuration, defines all npm scripts
- `eslint.config.js` -- ESLint configuration using flat config format
- `jest.config.json` -- Jest test configuration
- `.omfg.yml.example` -- Template configuration file for users

### Test Structure
- `tests/` directory -- Contains Jest test files
  - `integration.test.js` -- Tests for GitHub App integration
  - `utils.test.js` -- Additional utility tests
- `test/` directory -- Additional test files (legacy location)

### Documentation and Examples
- `README.md` -- Main project documentation
- `docs/QUICKSTART.md` -- Quick setup guide for users
- `.github/workflows/example-sync-fork.yml` -- Example workflow for users to copy

## Common Development Tasks

### Adding New Features
1. Create tests first in `tests/` directory
2. Implement feature in appropriate module (`app/index.js` or `app/syncFork.js`)
3. Run validation sequence: lint → test → syntax check
4. Test manually by starting the app and triggering relevant GitHub events

### Configuration Changes
- Always validate `.omfg.yml` parsing with `app/syncFork.js` functions
- Test both valid and invalid configurations
- Update example configuration if needed

### Debugging GitHub Events
- Set `LOG_LEVEL=debug` environment variable
- Use `DISABLE_WEBHOOK_EVENT_CHECK=true` for local testing
- Check Probot logs for event processing details

## Development Environment Setup

### Prerequisites
- Node.js 16+ (specified in package.json engines)
- npm (for dependency management)
- Git (for version control)

### Local Development Without GitHub App Configuration
1. Install dependencies: `npm install`
2. Install missing dev dependency: `npm install --save-dev nodemon`
3. Start in setup mode: `DISABLE_WEBHOOK_EVENT_CHECK=true npm start`
4. App runs on http://localhost:3000 in setup mode

### GitHub App Configuration (Production Setup)
1. Create GitHub App at https://github.com/settings/apps
2. Set environment variables: `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`
3. Configure webhook URL pointing to your server
4. Install app on target repositories

## Timing Expectations and Timeouts

- **npm install**: ~5 seconds - NEVER CANCEL
- **npm run lint**: ~0.5 seconds - Fast execution
- **npm test**: ~1 second - NEVER CANCEL, set timeout to 30+ seconds
- **npm start**: Immediate startup - NEVER CANCEL
- **Syntax checks**: Instant validation

**CRITICAL**: All build and test commands in this project are very fast. However, always set appropriate timeouts (30+ seconds) to account for varying system performance.

## Common Command Reference

### Full Development Workflow
```bash
# Initial setup
npm install
npm install --save-dev nodemon  # Fix missing dependency

# Validation sequence (run before every commit)
npm run lint
npm test
node -c app/index.js && node -c app/syncFork.js && node -c server.js

# Start development
DISABLE_WEBHOOK_EVENT_CHECK=true npm run dev

# Test landing page (after creating public directory)
mkdir -p public && echo "<h1>Test</h1>" > public/index.html
npm run start:landing
```

### Repository Root Contents
```
.
├── app/                    # Main application code
│   ├── index.js           # Probot app entry point
│   └── syncFork.js        # Fork sync logic
├── tests/                 # Jest test files
├── .github/workflows/     # CI/CD and example workflows
├── docs/                  # Documentation
├── server.js              # Landing page server
├── package.json           # Node.js project config
├── .omfg.yml.example      # User configuration template
└── README.md              # Project documentation
```

## Troubleshooting

### "nodemon: not found"
**Solution**: `npm install --save-dev nodemon`

### "ENOENT: no such file or directory, stat 'public/index.html'"
**Solution**: Landing page server needs public directory. Create minimal setup or skip landing page testing.

### "SmeeClient is not available"  
**Solution**: Normal warning in development. App works without it.

### Tests show 0% coverage
**Solution**: Jest config points to non-existent `src/` directory. Tests are in `tests/` and cover `app/` files.

---

**Remember**: Always run `npm run lint` before committing. The CI pipeline enforces linting and will fail if code doesn't pass ESLint validation.