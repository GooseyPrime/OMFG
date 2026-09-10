#!/usr/bin/env node
/**
 * OMFG Startup Script
 * Handles graceful startup with fallback modes for different deployment scenarios
 */

const { spawn } = require('child_process');
const http = require('http');

function getHealthPayload(isListening, hasGitHubAppConfig, port) {
  return {
    statusCode: isListening ? 200 : 503,
    body: {
      status: isListening ? 'ok' : 'starting',
      app: 'OMFG',
      message: isListening ? 'Oh My Forking Git startup server is running' : 'Startup server is initializing',
      timestamp: new Date().toISOString(),
      configured: hasGitHubAppConfig,
      port
    }
  };
}

function buildStatusPage(hasGitHubAppConfig) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <title>OMFG - Oh My Forking Git</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        :root {
            color-scheme: dark;
        }
        body {
            background: #0b0d10;
            color: #f5f0e8;
            font-family: 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            font-family: Fraunces, Georgia, serif;
            color: #f4ead8;
        }
        code {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
        }
        .status {
            background: #173328;
            padding: 10px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .warning {
            background: #3a2f12;
            padding: 10px;
            border-radius: 4px;
            margin: 20px 0;
        }
        a {
            color: #e9d9b5;
        }
    </style>
</head>
<body>
    <h1>🚀 OMFG - Oh My Forking Git</h1>
    <div class="status">✅ Service is running</div>
    ${!hasGitHubAppConfig ? '<div class="warning">⚠️ GitHub App not configured. Setup required for full functionality.</div>' : ''}
    <p>GitHub App for automated fork monitoring and synchronization.</p>
    <ul>
        <li><a href="/health">Health Check API</a></li>
        ${hasGitHubAppConfig ? '<li><a href="/probot">GitHub App Setup</a></li>' : ''}
    </ul>
    <p><small>Version 1.0.0 | <a href="https://github.com/GooseyPrime/OMFG">Source Code</a></small></p>
</body>
</html>`;
}

function buildErrorPage(errorPayload) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <title>OMFG Startup Error</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        :root {
            color-scheme: dark;
        }
        body {
            background: #0b0d10;
            color: #f5f0e8;
            font-family: 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            font-family: Fraunces, Georgia, serif;
            color: #f4ead8;
        }
        pre {
            background: #1a1f24;
            padding: 12px;
            border-radius: 6px;
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            overflow: auto;
        }
    </style>
</head>
<body>
    <h1>⚠️ OMFG Startup Error</h1>
    <p>${errorPayload.message}</p>
    <pre>${JSON.stringify(errorPayload, null, 2)}</pre>
</body>
</html>`;
}

function formatStartupError(error, context) {
  if (error && error.code === 'EADDRINUSE') {
    return {
      code: error.code,
      message: `Port ${context.port} is already in use. Set a free PORT value and restart OMFG.`,
      details: 'The process could not bind to the configured port.',
      configured: context.hasGitHubAppConfig,
      port: context.port
    };
  }

  return {
    code: error && error.code ? error.code : 'STARTUP_ERROR',
    message: error && error.message ? error.message : 'OMFG failed to start.',
    details: 'Check environment variables and startup logs for more details.',
    configured: context.hasGitHubAppConfig,
    port: context.port
  };
}

function createRequestHandler(state, context) {
  return (req, res) => {
    const path = req.url && req.url.split('?')[0] ? req.url.split('?')[0] : '';

    if (req.method === 'GET') {
      if (path === '/health' || path === '/healthz') {
        const health = getHealthPayload(state.isListening, context.hasGitHubAppConfig, context.port);
        res.writeHead(health.statusCode, { 'content-type': 'application/json' });
        res.end(JSON.stringify(health.body));
        return;
      }

      if (path === '/' || path === '/index.html') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(buildStatusPage(context.hasGitHubAppConfig));
        return;
      }

      if (path === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (path === '/robots.txt') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('User-agent: *\nAllow: /\nAllow: /health\n');
        return;
      }
    }

    if (req.method === 'POST') {
      const userAgent = req.headers['user-agent'] || '';
      if (userAgent.includes('GitHub-Hookshot')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          message: 'GitHub webhook received',
          status: context.hasGitHubAppConfig ? 'ready' : 'not_configured',
          note: context.hasGitHubAppConfig ? 'Webhook will be processed by main app' : 'GitHub App configuration required'
        }));
        return;
      }
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  };
}

function start() {
  const hasGitHubAppConfig = Boolean(process.env.APP_ID && process.env.PRIVATE_KEY);
  const isDeploymentEnvironment = process.env.RAILWAY_ENVIRONMENT ||
    process.env.HEROKU_APP_NAME ||
    process.env.VERCEL ||
    process.env.PORT;
  const parsedPort = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
  const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

  console.log('OMFG Startup Check:');
  console.log('- GitHub App Config:', hasGitHubAppConfig ? 'Yes' : 'No');
  console.log('- Deployment Environment:', isDeploymentEnvironment ? 'Yes' : 'No');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');

  const state = { isListening: false };
  const context = { hasGitHubAppConfig, port };
  const healthServer = http.createServer(createRequestHandler(state, context));

  healthServer.on('error', (error) => {
    const payload = formatStartupError(error, context);
    console.error(JSON.stringify(payload));
    console.error(buildErrorPage(payload));
    process.exit(1);
  });

  healthServer.listen(port, '0.0.0.0', () => {
    state.isListening = true;
    console.log(`OMFG Health Server listening on http://0.0.0.0:${port}`);
  });

  if (hasGitHubAppConfig) {
    console.log('Starting main Probot app...');

    const env = { ...process.env };
    if (isDeploymentEnvironment && !env.NODE_ENV) {
      console.log('Deployment environment detected, but keeping NODE_ENV flexible');
    }

    const probotProcess = spawn('npm', ['run', 'start:original'], {
      stdio: 'inherit',
      env
    });

    probotProcess.on('error', (error) => {
      console.error('Failed to start main Probot app:', error);
    });

    probotProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Main Probot app exited with code ${code}`);
      }
    });
  } else {
    console.log('GitHub App not configured. Running in minimal mode.');
    console.log('To enable full functionality, set APP_ID and PRIVATE_KEY environment variables.');
  }

  const shutdown = () => {
    console.log('Shutting down gracefully...');
    healthServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return healthServer;
}

if (require.main === module) {
  start();
}

module.exports = {
  buildErrorPage,
  buildStatusPage,
  createRequestHandler,
  formatStartupError,
  getHealthPayload,
  start
};
