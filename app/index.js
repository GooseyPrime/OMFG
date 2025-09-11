/**
 * OMFG (Oh My Forking Git) - GitHub App for automated fork monitoring and synchronization
 * 
 * This is the main Probot app entrypoint that handles GitHub events and coordinates
 * fork synchronization activities.
 */

const { syncFork, loadConfig, validateConfig } = require('./syncFork');

/**
 * Main Probot app function
 * @param {import('probot').Probot} app - The Probot app instance
 */
module.exports = (app) => {
  // Enhanced startup logging for deployment debugging
  app.log.info('OMFG GitHub App is starting up! 🚀');
  app.log.info('Environment info:', {
    nodeVersion: process.version,
    port: process.env.PORT || 3000,
    hasAppId: !!process.env.APP_ID,
    hasPrivateKey: !!process.env.PRIVATE_KEY,
    hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
    webhookPath: app.webhookPath
  });

  // Add process error handling for uncaught exceptions
  process.on('uncaughtException', (error) => {
    app.log.error('Uncaught exception during startup:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    app.log.error('Unhandled rejection at:', promise, 'reason:', reason);
  });

  // Handle repository installation events
  app.on('installation.created', async (context) => {
    try {
      app.log.info(`OMFG installed on ${context.payload.installation.account.login}`);
    } catch (error) {
      app.log.error('Error processing installation.created event:', error);
    }
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

      // Load and validate configuration with error handling
      let config;
      try {
        config = await loadConfig(context);
      } catch (configError) {
        app.log.error(`Failed to load config for ${repository.full_name}:`, configError);
        return;
      }

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
        try {
          await syncFork(context, config);
        } catch (syncError) {
          app.log.error(`Fork sync failed for ${repository.full_name}:`, syncError);
        }
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

  // Enhanced final startup logging
  app.log.info('OMFG GitHub App is ready! 🎯');
  app.log.info('App configuration status:', {
    isSetupMode: !process.env.APP_ID || !process.env.PRIVATE_KEY,
    webhookPath: app.webhookPath,
    version: require('../package.json').version
  });
  
  // Log ready status after initialization is complete
  app.ready().then(() => {
    app.log.info('OMFG app initialization completed successfully');
  }).catch((error) => {
    app.log.error('OMFG app initialization failed:', error);
  });
};