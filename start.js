#!/usr/bin/env node
/**
 * OMFG Startup Script
 * Handles graceful startup with fallback modes for different deployment scenarios
 */

const { spawn } = require('child_process');
const http = require('http');

// Check if we have the minimum required environment variables for Probot
const hasGitHubAppConfig = process.env.APP_ID && process.env.PRIVATE_KEY;
const isDeploymentEnvironment = process.env.RAILWAY_ENVIRONMENT || 
                               process.env.HEROKU_APP_NAME || 
                               process.env.VERCEL || 
                               process.env.PORT;

console.log('OMFG Startup Check:');
console.log('- GitHub App Config:', hasGitHubAppConfig ? 'Yes' : 'No');
console.log('- Deployment Environment:', isDeploymentEnvironment ? 'Yes' : 'No');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');

// Start a minimal health server immediately to handle health checks
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const healthServer = http.createServer((req, res) => {
  const path = req.url?.split('?')[0] || '';
  
  if (req.method === 'GET') {
    if (path === '/health' || path === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        app: 'OMFG',
        message: 'Oh My Forking Git startup server is running',
        timestamp: new Date().toISOString(),
        configured: hasGitHubAppConfig,
        port: port
      }));
      return;
    }
    
    if (path === '/' || path === '/index.html') {
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
        .warning { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 20px 0; }
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
</html>`);
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
  
  // Handle POST requests (like GitHub webhooks) by providing info
  if (req.method === 'POST') {
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('GitHub-Hookshot')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        message: 'GitHub webhook received',
        status: hasGitHubAppConfig ? 'ready' : 'not_configured',
        note: hasGitHubAppConfig ? 'Webhook will be processed by main app' : 'GitHub App configuration required'
      }));
      return;
    }
  }
  
  // 404 for other requests
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not Found');
});

// Start the health server
healthServer.listen(port, '0.0.0.0', () => {
  console.log(`OMFG Health Server listening on http://0.0.0.0:${port}`);
});

// If we have GitHub App config, try to start the main Probot app
if (hasGitHubAppConfig) {
  console.log('Starting main Probot app...');
  
  // Ensure we don't set NODE_ENV=production unless explicitly requested
  const env = { ...process.env };
  if (isDeploymentEnvironment && !env.NODE_ENV) {
    // Don't set NODE_ENV=production to avoid Probot's strict requirements
    console.log('Deployment environment detected, but keeping NODE_ENV flexible');
  }
  
  const probotProcess = spawn('npm', ['run', 'start:probot'], {
    stdio: 'inherit',
    env: env
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  healthServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  healthServer.close();
  process.exit(0);
});