/**
 * Simple Express server to serve the OMFG landing page
 * This runs alongside the Probot app to provide a static landing page
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const rawBasePort = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const basePort = Number.isNaN(rawBasePort) ? 3000 : rawBasePort;
const port = basePort + 1;
const publicPath = path.join(__dirname, 'public');
const indexPath = path.join(publicPath, 'index.html');
const serverState = { isListening: false };

function getHealthPayload(isListening) {
  return {
    statusCode: isListening ? 200 : 503,
    body: {
      status: isListening ? 'ok' : 'starting',
      service: 'OMFG Landing Page',
      message: isListening ? 'Landing page server is running! 🎯' : 'Landing page server is initializing'
    }
  };
}

function buildLandingErrorHtml(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OMFG Landing Page Error</title>
  <style>
    :root {
      color-scheme: dark;
    }
    body {
      background: #0b0d10;
      color: #f5f0e8;
      font-family: 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif;
      margin: 40px auto;
      max-width: 760px;
      line-height: 1.5;
      padding: 0 20px;
    }
    h1 {
      font-family: Fraunces, Georgia, serif;
      color: #f4ead8;
    }
    code {
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <h1>⚠️ OMFG landing page unavailable</h1>
  <p>${message}</p>
</body>
</html>`;
}

function buildServerErrorPayload(error) {
  if (error && error.code === 'EADDRINUSE') {
    return {
      code: error.code,
      message: `Port ${port} is already in use. Set a free PORT value before running npm run start:landing.`,
      details: 'Landing page server could not bind to the selected port.',
      port
    };
  }

  return {
    code: error && error.code ? error.code : 'LANDING_STARTUP_ERROR',
    message: error && error.message ? error.message : 'Landing page server failed to start.',
    details: 'Check startup logs for more information.',
    port
  };
}

// Serve static assets
app.use('/assets', express.static(path.join(publicPath, 'assets')));

// Serve the landing page at root
app.get('/', (req, res) => {
  if (!fs.existsSync(indexPath)) {
    const message = `Missing ${indexPath}. Add public/index.html before starting the landing page server.`;
    res.status(503).type('html').send(buildLandingErrorHtml(message));
    return;
  }

  res.sendFile(indexPath);
});

// Health check for the landing page server
app.get('/health', (req, res) => {
  const health = getHealthPayload(serverState.isListening);
  res.status(health.statusCode).json(health.body);
});

function startServer() {
  const server = app.listen(port, () => {
    serverState.isListening = true;
    console.log(`OMFG Landing Page server running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    const payload = buildServerErrorPayload(error);
    console.error(JSON.stringify(payload));
    process.exit(1);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.buildLandingErrorHtml = buildLandingErrorHtml;
module.exports.buildServerErrorPayload = buildServerErrorPayload;
module.exports.getHealthPayload = getHealthPayload;
module.exports.serverState = serverState;
module.exports.startServer = startServer;
