import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 2000;

// Connect to MongoDB and start HTTP server
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[Server] College Portal Backend running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const handleExit = () => {
    console.log('[Server] Closing HTTP server and terminating gracefully...');
    server.close(() => {
      console.log('[Server] Closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleExit);
  process.on('SIGINT', handleExit);
};

startServer().catch((err) => {
  console.error('[Server Startup Error]:', err);
  process.exit(1);
});
