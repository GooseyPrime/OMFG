/**
 * Enhanced startup script for OMFG that provides better deployment support
 * This ensures proper error handling and logging regardless of configuration state
 */

// Enhanced startup logging
console.log('🚀 OMFG (Oh My Forking Git) - Enhanced Startup');
console.log('📊 Environment Info:', {
  nodeVersion: process.version,
  port: process.env.PORT || 3000,
  platform: process.platform,
  hasAppId: !!process.env.APP_ID,
  hasPrivateKey: !!process.env.PRIVATE_KEY,
  hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
  railway: !!process.env.RAILWAY_ENVIRONMENT,
  timestamp: new Date().toISOString()
});

// Ensure required environment variables are set to prevent startup crashes
if (!process.env.APP_ID) {
  console.log('⚠️  APP_ID not found, setting dummy value for deployment compatibility');
  process.env.APP_ID = '1';
}

if (!process.env.PRIVATE_KEY) {
  console.log('⚠️  PRIVATE_KEY not found, setting dummy value for deployment compatibility');
  // gitguardian:ignore
  process.env.PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJhvV3jKL9Jv\n**THIS-IS-A-FAKE-TEST-KEY-NOT-REAL**\ndummy-key-for-deployment-only-not-a-real-private-key\n-----END PRIVATE KEY-----';
}

if (!process.env.WEBHOOK_SECRET) {
  console.log('⚠️  WEBHOOK_SECRET not found, setting development default');
  process.env.WEBHOOK_SECRET = 'development';
}

// Add global error handlers for better debugging
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception during startup:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Use spawn to start Probot with proper environment
const { spawn } = require('child_process');

console.log('🔧 Starting Probot with enhanced environment...');

const probotProcess = spawn('npx', ['probot', 'run', './app/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DISABLE_WEBHOOK_EVENT_CHECK: 'true',
    HOST: '0.0.0.0' // Ensure binding to all interfaces for Railway
  }
});

probotProcess.on('error', (error) => {
  console.error('💥 Failed to start Probot process:', error);
  process.exit(1);
});

probotProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`💥 Probot process exited with code ${code}, signal ${signal}`);
    process.exit(code || 1);
  } else {
    console.log('✅ Probot process exited normally');
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📤 Received SIGTERM, shutting down gracefully...');
  probotProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📤 Received SIGINT, shutting down gracefully...');
  probotProcess.kill('SIGINT');
});

console.log('🎯 Enhanced startup script execution complete');