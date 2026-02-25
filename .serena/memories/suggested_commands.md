# Suggested Commands for Eltran-PIDS-Dummy

## Development
- `npm run dev:all`: Launch Master, Selector, and Command Center apps simultaneously.
- `npm run dev:all-led`: Launch all apps including the LED display simulator.
- `npm run vite:master`: Run the Vite dev server for `master-app`.
- `npm run electron:master`: Launch the Electron window for `master-app` (requires Vite server).
- `npm run dev:cc`: Run Vite for Command Center.
- `npm run electron:cc`: Launch Electron for Command Center.

## Build and Deployment
- `npm run build`: Build all workspaces for production.

## System Maintenance
- `git restore .`: Use this if package files are unexpectedly missing from the disk.
- `npm install`: Re-install dependencies and link workspaces if they are not recognized.
