# Eltran PIDS Dummy

A micro-frontend Passenger Information Display System (PIDS) designed for railway operations. This repository serves as a production-grade scaffolding environment, supporting both simulation ("dummy mode") and hardware integration ("hardware mode") via a strict Hardware Abstraction Layer (HAL).

## Architecture

The system follows a monorepo structure with five core packages:

- `master-app`: The central application. Hosts the Express.js backend API server (port 3001), Socket.IO real-time hub, and the primary dashboard UI.
- `selector-app`: A thin client application intended for deployment on Raspberry Pi touchscreens at stations. Provides train selection and real-time display preview.
- `command-center-app`: An administrative panel for managing trains, stations, routes, schedules, users, logs, and backups.
- `shared`: Contains reusable React components and the Hardware Abstraction Layer (HAL) implementation, including adapter interfaces and service factories.
- `pids-core`: A type-only package defining domain models, constants, and event schemas used across all applications.

Data persistence is handled by a PostgreSQL database (`eltran_pids`) managed via Docker Compose. Real-time communication between frontend clients and the backend is achieved through Socket.IO.

## Getting Started

### Prerequisites

- Node.js v18 or later
- Docker Desktop (with Docker Engine running)
- Git

### Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Rageronee/pids_dummy.git
   cd Eltran-PIDS-Dummy
   ```

2. Install dependencies for all workspaces:
   ```bash
   npm install
   ```

3. Start the PostgreSQL database container:
   ```bash
   docker compose up -d db
   ```
   The database will be available at `localhost:5432` with username `postgres`, password `postgres`, and database name `eltran_pids`.

4. Seed the database with initial data:
   ```bash
   cd Eltran-PIDS-Dummy/packages/master-app
   node seed-database.mjs
   ```

5. Start the backend API server:
   ```bash
   node start-api.mjs
   ```
   The API server will be available at `http://localhost:3001`.

## 🚀 Production Deployment (Docker)

To deploy this project to an Ubuntu server (e.g., 24/7 mission control):

1. **Prerequisites:**
   - Docker & Docker Compose installed.
   - SSH access (via PuTTY or CMD).
   - Git installed on the server.

2. **One-Time Setup:**
   ```bash
   git clone https://github.com/Rageronee/pids_dummy.git
   cd pids_dummy/Eltran-PIDS-Dummy
   docker-compose up -d --build
   ```

3. **Updating Code (Continuous Deployment):**
   Push your changes from your local machine, then on the server run:
   ```bash
   git pull origin main && docker-compose up -d --build
   ```

4. **Accessing Apps:**
   - Master: `http://<SERVER_IP>/master/`
   - Selector: `http://<SERVER_IP>/selector/`
   - Command Center: `http://<SERVER_IP>/cc/`

---

6. In a new terminal, start the desired frontend application:
   - Master App: `npm run dev:master` → `http://localhost:5173`
   - Selector App: `npm run dev:selector` → `http://localhost:5174`
   - Command Center App: `npm run dev:cc` → `http://localhost:5176`

## Core Features

### Authentication & Authorization
- Session-based authentication using HTTP cookies.
- Two predefined roles: `Admin` and `Operator`.
- Role-specific access control is enforced on critical backend endpoints (e.g., `/api/admin/backups`, `/api/logs`). Frontend route protection is not yet implemented.

### Backend API
The Express.js backend provides a comprehensive RESTful API and Socket.IO events. Key endpoints include:
- `POST /api/auth/login`: Authenticates user credentials and establishes a session.
- `POST /api/auth/logout`: Terminates the current session.
- `GET /api/auth/me`: Returns the authenticated user's profile and role.
- `GET /api/health`: A simple health check endpoint.
- Full CRUD operations for `trains`, `stations`, `routes`, `schedules`, `coaches`, `users`, `sensors`, and `logs`.

### Hardware Abstraction Layer (HAL)
The HAL decouples application logic from physical hardware:
- `DummyPidsService`: The default implementation, generating simulated sensor data and logging commands to the console.
- `HardwarePidsService`: A placeholder implementation. To be activated, it requires the creation of concrete adapters for display, TV control, and sensor reading.

### Data Management
- Audit logs are written to both the PostgreSQL database and mirrored to the filesystem at `Eltran-PIDS-Dummy/packages/master-app/runtime/audit/`.
- Backup snapshots are stored in `Eltran-PIDS-Dummy/packages/master-app/runtime/backups/`.

## System Requirements

| Component | Requirement | Notes |
|-----------|-------------|-------|
| Database | PostgreSQL 15+ | Managed via Docker Compose. Custom `pg_hba.conf` is mounted for development authentication. |
| Frontend | Vite 5+ | Each application uses Vite for fast development builds. |
| Backend | Node.js 18+ | Express.js and Socket.IO for the API server. |
| Hardware Mode | Serial port (`/dev/ttyUSB0`) or GPIO interface | Required only when activating the `HardwarePidsService`. |

## API Reference

The full OpenAPI specification is not yet generated. For current endpoint details, refer to the backend source code in `Eltran-PIDS-Dummy/packages/master-app/src/routes/` and the `FIX_SUMMARY.md` document.

## Contributing

Contributions are welcome. Please ensure that:
- All new features are covered by unit or integration tests.
- Type definitions in `pids-core` are updated and consumed by dependent packages.
- Changes to the HAL adhere to the established adapter interface contracts.
- Documentation in `README.md` and `FIX_SUMMARY.md` is updated to reflect any changes in behavior or setup.

For detailed technical analysis of the current implementation, including identified gaps and improvement priorities, consult `Eltran-PIDS-Dummy-Analysis.md`.