# Coding Style and Conventions

- **Language**: TypeScript throughout the project.
- **State Management**: React Hooks and Local API polling for synchronization.
- **CSS**: Tailwind CSS for layout and styling.
- **Naming**: 
  - Components: PascalCase (e.g., `LoginScreen.tsx`).
  - Hooks: camelCase starting with `use` (e.g., `usePidsData.ts`).
  - Services: PascalCase (e.g., `DatabaseService.ts`).
- **Authorization**: Bearer token authentication stored in `sessionStorage`.
- **Logging**: Audit trail using `writeLog()` helper, stored in `eltran-pids-logs.json`.
