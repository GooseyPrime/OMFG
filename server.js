/**
 * Simple Express server to serve the OMFG landing page
 * This runs alongside the Probot app to provide a static landing page
 */

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) + 1 : 3001;
const publicPath = path.join(__dirname, 'public');

// Serve static assets
app.use('/assets', express.static(path.join(publicPath, 'assets')));

// Serve the landing page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Health check for the landing page server
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OMFG Landing Page',
    message: 'Landing page server is running! 🎯'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`OMFG Landing Page server running on http://localhost:${port}`);
});

module.exports = app;