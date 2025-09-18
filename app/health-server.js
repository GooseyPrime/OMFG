/**
 * Standalone health server that runs alongside the main Probot app
 * This ensures health endpoints work even if the main app fails to configure properly
 */

const http = require('http');

// Only start this if we're in a production environment (Railway, Heroku, etc.)
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.RAILWAY_ENVIRONMENT || 
                     process.env.PORT;

if (isProduction) {
  const port = process.env.HEALTH_PORT || (process.env.PORT ? parseInt(process.env.PORT) + 100 : 3001);
  
  const healthServer = http.createServer((req, res) => {
    const path = req.url?.split('?')[0] || '';
    
    // CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.method === 'GET' && (path === '/health' || path === '/healthz' || path === '/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        app: 'OMFG Health Check',
        message: 'Standalone health server is running',
        timestamp: new Date().toISOString(),
        port: port,
        pid: process.pid
      }));
      return;
    }
    
    // 404 for other paths
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  });
  
  healthServer.listen(port, '0.0.0.0', () => {
    console.log(`OMFG Health Server listening on http://0.0.0.0:${port}`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Health server shutting down gracefully');
    healthServer.close();
  });
}

module.exports = { isProduction };