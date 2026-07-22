// ============================================================================
// MLIMS — Server Entry Point
// ============================================================================

const app = require('./app');
const config = require('./config');
const { closeAllPools } = require('./db/pools');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`[MLIMS Phase 2] REST API listening on port ${PORT} in ${config.env} mode.`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await closeAllPools();
      console.log('PostgreSQL connection pools closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
