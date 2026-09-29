const http = require('node:http');
const mongoose = require('mongoose');
const app = require('./app');
const connectDatabase = require('./config/database');
const env = require('./config/env');

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);
  server.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down`);
    server.close((error) => {
      if (error) {
        console.error('HTTP server shutdown failed', error);
        process.exitCode = 1;
      }

      mongoose.disconnect().catch((disconnectError) => {
        console.error('MongoDB shutdown failed', disconnectError);
        process.exitCode = 1;
      });
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('Server startup failed', error);
  process.exitCode = 1;
});
