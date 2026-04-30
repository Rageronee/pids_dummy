/**
 * Standalone Backend Entry Point for PIDS
 * Used for running the API server without Electron (e.g., in Docker/Linux Server)
 */

import { startApiServer } from "./electron/api.js";

async function run() {
  console.log("-----------------------------------------");
  console.log("PIDS Backend (Standalone Mode)");
  console.log("Starting API Server...");
  console.log("-----------------------------------------");
  
  try {
    await startApiServer();
    console.log("Backend is running and ready to handle requests.");
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down...');
      // Note: Add stopApiServer if exported correctly
      process.exit(0);
    });
    
  } catch (error) {
    console.error("Failed to start API Server:", error);
    process.exit(1);
  }
}

run();
