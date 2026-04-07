/**
 * Standalone API Server Starter
 * Start the backend API (Express + Socket.IO) without Electron
 * Usage: node start-api.mjs
 */
import 'dotenv/config';
import { startApiServer } from './electron/api.js';

console.log('🚀 Starting PIDS API Server...');
console.log('');
console.log('API will be available at: http://localhost:3001');
console.log('Socket.IO will be available at: ws://localhost:3001');
console.log('');
console.log('Frontend dev servers can connect to this API.');
console.log('Press Ctrl+C to stop.');
console.log('');

try {
    await startApiServer();
    console.log('✅ API Server is running!');
    console.log('');
    console.log('Test login with:');
    console.log('  curl -X POST http://localhost:3001/api/auth/login ^');
    console.log('    -H "Content-Type: application/json" ^');
    console.log('    -d "{\"username\":\"operator\",\"password\":\"operator123\"}"');
    console.log('');
} catch (e) {
    console.error('❌ Failed to start API server:', e.message);
    console.error(e.stack);
    process.exit(1);
}

// Keep process alive
process.stdin.resume();
