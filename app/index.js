/**
 * OMFG (Oh My Forking Git) - GitHub App for automated fork monitoring and synchronization
 * 
 * This is the main Probot app entrypoint that handles GitHub events and coordinates
 * fork synchronization activities.
 */

const { syncFork, loadConfig, validateConfig } = require('./syncFork');

// Start health server for production environments
try {
  require('./health-server');
} catch (error) {
  console.warn('Health server could not be started:', error.message);
}

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

/**
 * Main Probot app function
 * @param {import('probot').Probot} app - The Probot app instance
 * @param {Object} options - App options including addHandler for custom routes
 */
module.exports = (app, options = {}) => {
  const addHandler = options.addHandler;
  
  app.log.info('OMFG GitHub App is starting up! 🚀');

  // Add health check and basic route handlers for production deployments
  if (addHandler) {
    // Health endpoint - essential for deployment health checks
    // This needs to work even in setup mode for Railway and other platforms
    addHandler((req, res) => {
      if (req.method === 'GET') {
        const path = req.url?.split('?')[0] || '';
        if (path === '/health' || path === '/healthz') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            app: 'OMFG',
            message: 'Oh My Forking Git is running! 🚀',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }));
          return true;
        }
      }
      return false;
    });

    // Root endpoint - provide a basic landing page
    addHandler((req, res) => {
      if (req.method === 'GET') {
        const path = req.url?.split('?')[0] || '';
        if (path === '/') {
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>OMFG - Oh My Forking Git</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
               max-width: 800px; margin: 50px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #0366d6; }
        .status { background: #d4edda; padding: 10px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🚀 OMFG - Oh My Forking Git</h1>
    <div class="status">✅ Service is running and healthy</div>
    <p>GitHub App for automated fork monitoring and synchronization.</p>
    <ul>
        <li><a href="/health">Health Check API</a></li>
        <li><a href="/probot">GitHub App Setup</a></li>
    </ul>
    <p><small>Version 1.0.0 | <a href="https://github.com/GooseyPrime/OMFG">Source Code</a></small></p>
</body>
</html>`);
          return true;
        }
      }
      return false;
    });

    // Handle common static file requests to prevent 404s
    addHandler((req, res) => {
      if (req.method === 'GET') {
        const path = req.url?.split('?')[0] || '';
        
        // Handle favicon.ico
        if (path === '/favicon.ico') {
          res.writeHead(204); // No Content
          res.end();
          return true;
        }
        
        // Handle robots.txt - allow indexing of basic pages
        if (path === '/robots.txt') {
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end(`User-agent: *
Allow: /
Allow: /health
Disallow: /probot/
Disallow: /api/
`);
          return true;
        }
        
        // Handle index.html by redirecting to root
        if (path === '/index.html') {
          res.writeHead(302, { 'Location': '/' });
          res.end();
          return true;
        }

        // Handle basic API info endpoint
        if (path === '/api' || path === '/api/') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            name: 'OMFG GitHub App',
            version: '1.0.0',
            status: 'running',
            endpoints: {
              health: '/health',
              webhooks: '/api/github/webhooks',
              setup: '/probot'
            }
          }));
          return true;
        }
      }
      return false;
    });

    // Handle POST requests to root (GitHub webhooks might hit this)
    addHandler((req, res) => {
      if (req.method === 'POST') {
        const path = req.url?.split('?')[0] || '';
        const userAgent = req.headers['user-agent'] || '';
        
        // Check if this looks like a GitHub webhook
        if (path === '/' && userAgent.includes('GitHub-Hookshot')) {
          // Redirect GitHub webhooks to the proper endpoint
          res.writeHead(302, { 'Location': '/api/github/webhooks' });
          res.end();
          return true;
        }
      }
      return false;
    });
  }

  // Handle repository installation events
  app.on('installation.created', async (context) => {
    app.log.info(`OMFG installed on ${context.payload.installation.account.login}`);
  });

  // Handle push events
  app.on('push', async (context) => {
    try {
      const { repository, ref } = context.payload;
      
      // Only process pushes to main/master branches
      if (!ref.includes('refs/heads/main') && !ref.includes('refs/heads/master')) {
        return;
      }

      app.log.info(`Push event received for ${repository.full_name} on ${ref}`);

      // Load and validate configuration
      const config = await loadConfig(context);
      if (!config) {
        app.log.debug(`No .omfg.yml found in ${repository.full_name}, skipping`);
        return;
      }

      const validation = validateConfig(config);
      if (!validation.valid) {
        app.log.error(`Invalid configuration in ${repository.full_name}: ${validation.errors.join(', ')}`);
        return;
      }

      // Check if this is a fork and auto_sync is enabled
      if (repository.fork && config.auto_sync) {
        app.log.info(`Auto-sync enabled for fork ${repository.full_name}`);
        await syncFork(context, config);
      }
    } catch (error) {
      app.log.error('Error processing push event:', error);
    }
  });

  // Handle pull request events
  app.on('pull_request.opened', async (context) => {
    try {
      const { repository, pull_request } = context.payload;
      
      app.log.info(`Pull request opened in ${repository.full_name}: #${pull_request.number}`);

      // Load configuration to check if we should monitor this repo
      const config = await loadConfig(context);
      if (!config) {
        return;
      }

      // If this is a fork, we might want to check for conflicts with upstream
      if (repository.fork) {
        app.log.info(`Pull request in fork ${repository.full_name}, checking for upstream conflicts`);
        // TODO: Add conflict detection logic
      }
    } catch (error) {
      app.log.error('Error processing pull_request event:', error);
    }
  });

  // Handle fork events
  app.on('fork', async (context) => {
    try {
      const { repository, forkee } = context.payload;
      
      app.log.info(`Repository ${repository.full_name} was forked to ${forkee.full_name}`);

      // Create a comment or issue welcoming the new fork and explaining OMFG
      try {
        await context.octokit.issues.create({
          owner: forkee.owner.login,
          repo: forkee.name,
          title: '🎉 Welcome to OMFG - Automated Fork Sync Setup',
          body: `Welcome to OMFG! 🎉

This fork has been detected by the OMFG GitHub App. To enable automated synchronization with the upstream repository, please:

1. Create a \`.omfg.yml\` file in your repository root
2. Configure it based on the example below:

\`\`\`yaml
auto_sync: true
upstream: ${repository.full_name}
\`\`\`

Once configured, OMFG will automatically keep your fork synchronized with upstream changes!

For more information, visit: https://github.com/GooseyPrime/OMFG`
        });

        app.log.info(`Created welcome issue in ${forkee.full_name}`);
      } catch (issueError) {
        app.log.error(`Failed to create welcome issue in ${forkee.full_name}:`, issueError);
      }
    } catch (error) {
      app.log.error('Error processing fork event:', error);
    }
  });

  // Handle installation events for repositories
  app.on('installation_repositories.added', async (context) => {
    try {
      const { repositories_added, installation } = context.payload;
      
      app.log.info(`OMFG added to ${repositories_added.length} repositories by ${installation.account.login}`);

      for (const repo of repositories_added) {
        app.log.info(`Now monitoring ${repo.full_name}`);
      }
    } catch (error) {
      app.log.error('Error processing installation_repositories event:', error);
    }
  });

  // Health check endpoint - commented out due to API change in Probot v14
  // TODO: Re-enable when compatible route method is found
  // app.route().get('/health', (req, res) => {
  //   res.json({
  //     status: 'ok',
  //     app: 'OMFG',
  //     message: 'Oh My Forking Git is running! 🚀'
  //   });
  // });

  app.log.info('OMFG GitHub App is ready! 🎯');
};