/**
 * Enhanced startup script for OMFG that provides better deployment support
 * This ensures proper error handling and logging regardless of configuration state
 */

const { buildErrorPage, formatStartupError, start } = require('./start');

const rawPort = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const port = Number.isNaN(rawPort) ? 3000 : rawPort;

console.log('🚀 OMFG (Oh My Forking Git) - Enhanced Startup');
console.log('📊 Environment Info:', {
  nodeVersion: process.version,
  port,
  platform: process.platform,
  hasAppId: !!process.env.APP_ID,
  hasPrivateKey: !!process.env.PRIVATE_KEY,
  hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
  railway: !!process.env.RAILWAY_ENVIRONMENT,
  timestamp: new Date().toISOString()
});

process.on('uncaughtException', (error) => {
  const payload = formatStartupError(error, {
    hasGitHubAppConfig: Boolean(process.env.APP_ID && process.env.PRIVATE_KEY),
    port
  });
  console.error('💥 Uncaught Exception during startup');
  console.error(JSON.stringify(payload));
  console.error(buildErrorPage(payload));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const payload = formatStartupError(error, {
    hasGitHubAppConfig: Boolean(process.env.APP_ID && process.env.PRIVATE_KEY),
    port
  });
  console.error('💥 Unhandled Rejection during startup');
  console.error(JSON.stringify(payload));
  console.error(buildErrorPage(payload));
  process.exit(1);
});

console.log('🔧 Starting startup server...');
start();
console.log('🎯 Enhanced startup script execution complete');
