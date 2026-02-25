# Master Console PIDS v3.0 (master-app)

The UI of the `master-app` MasterConsolePanel was completely redesigned to improve space usage and clarity:
- **Layout**: Uses a full-width 1-column layout with `SectionAccordion` components for expansible/collapsible sections instead of a rigid grid.
- **Styling**: Uses KAI brand colors (Deep Blue `#1d2d6a` and Orange `#ee6f1f`), with clean spacing and shadows.
- **Toolbar**: The global action toolbar (GPS, Warna LED, Outdoor, Arah, Simpan) is positioned as a fixed bar at the bottom of the screen (`fixed bottom-0 z-[60]`).
- **Data & Telemetry**: Added detailed satellite telemetry info (Longitude, Latitude, Kecepatan, Haluan, Ketinggian, Geofencing).
- **Navigation Data**: Populated the Checkpoint routing table with 16 hardcoded stations (from BUMIWALIYA to SIDAREJA) tracking ETA and status ('BERHENTI' / 'ANTARA').
- **Stampformasi Separation**: Removed the Stampformasi table from the bottom of the PIDS dashboard. It is now completely separated into its own dedicated routing tab (`activeTab === 'stampformasi'`) in the `App.tsx` navigation sidebar.