import { startApiServer } from "./electron/api.js";

async function main() {
  console.log("Starting API server...");
  await startApiServer();
  console.log("API Server started successfully!");
}

main().catch(err => {
  console.error("Failed to start API server:", err);
});
