# Project Overview: Eltran-PIDS-Dummy

The **Eltran-PIDS-Dummy** is a simulation and scaffolding project designed to model the behaviors, constraints, and UI/UX of a Passenger Information Display System (PIDS) for train carriages, specifically adhering to KAI's branding.

## Tech Stack
- **Architecture**: Micro-Frontend in a monorepo structure using npm workspaces.
- **Frontend**: React (with Vite), TypeScript, Tailwind CSS.
- **Runtime**: Electron for wrapping the micro-frontends.
- **Communication**: Local REST API Gateway hosted by the `master-app` (port 3001).
- **Styling**: KAI standard colors (#1d2d6a Navy, #ee6f1f Orange), Inter/Black fonts.

## Core Packages
- `master-app`: Central hub, API gateway, and main PIDS dashboard.
- `selector-app`: Remote interface for train announcers/conductors.
- `led-app`: Matrix display simulation (P10/P4 panels).
- `command-center-app`: Admin interface for managing routes, trains, and monitoring logs.
- `pids-core`: Shared TypeScript interfaces and types.
- `shared`: Shared components and utilities.
